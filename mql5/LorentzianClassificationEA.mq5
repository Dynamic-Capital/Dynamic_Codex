#property copyright "2024"
#property version   "1.00"
#property strict

// Simplified port of the "Lorentzian Classification" Pine Script indicator
// Implements a basic KNN classifier using Lorentzian distance on RSI and ADX features.
// Opens trades based on predicted direction and reports actions to Supabase via WebRequest.

#include <Trade/Trade.mqh>
CTrade trade;

input int    NeighborsCount    = 8;     // number of neighbors to consider
input int    MaxBarsBack       = 2000;  // max history size
input int    RSI_Period        = 14;    // feature 1
input int    ADX_Period        = 14;    // feature 2
input double Lots              = 0.10;  // fallback lot size

input double RiskPerTrade      = 1.0;   // % balance risked per trade
input double StopLossPoints    = 200;   // stop loss distance in points
input double TakeProfitPoints  = 400;   // take profit distance in points
input double TrailingStopPoints= 100;   // trailing stop distance in points
input int    Slippage          = 5;     // max slippage in points
input double MaxSpread         = 20;    // max allowed spread in points
input int    StartHour         = 0;     // trading session start hour
input int    EndHour           = 24;    // trading session end hour
input ulong  MagicNumber       = 123456;// unique magic number

string SupabaseURL = "https://xyz.supabase.co/functions/v1/ea-report"; // replace with your endpoint

double CalculateLot();
void   ApplyTrailingStop();

// feature storage
struct FeatureRow
{
   double rsi;
   double adx;
   int    label; // 1 long, -1 short, 0 neutral
};

FeatureRow rows[];
int totalRows = 0;

int lastProcessedBar = -1;

int OnInit()
{
   ArrayResize(rows, MaxBarsBack);
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(Slippage);
   return(INIT_SUCCEEDED);
}

void OnTick()
{
   ApplyTrailingStop();

   // trading session filter
   datetime now = TimeCurrent();
   int hour = TimeHour(now);
   if(hour < StartHour || hour >= EndHour)
      return;

   // spread check
   double spread = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID)) / _Point;
   if(spread > MaxSpread)
      return;

   // process only on new bar
   int currentBar = iBars(_Symbol, PERIOD_CURRENT);
   if(currentBar == lastProcessedBar)
      return;
   lastProcessedBar = currentBar;

   double rsi = iRSI(_Symbol, PERIOD_CURRENT, RSI_Period, PRICE_CLOSE, 0);
   double adx = iADX(_Symbol, PERIOD_CURRENT, ADX_Period, 0, PRICE_CLOSE, 0);

   // store feature row
   if(totalRows < MaxBarsBack)
      totalRows++;
   for(int i = totalRows-1; i > 0; --i)
      rows[i] = rows[i-1];
   rows[0].rsi = rsi;
   rows[0].adx = adx;
   rows[0].label = 0; // placeholder for future bar label

   // update label for bar 4 bars ago
   if(totalRows > 4)
   {
      double futureClose = iClose(_Symbol, PERIOD_CURRENT, 0);
      double pastClose   = iClose(_Symbol, PERIOD_CURRENT, 4);
      rows[4].label = (futureClose > pastClose) ? 1 : (futureClose < pastClose ? -1 : 0);
   }

   // skip until we have at least neighborsCount bars with labels
   if(totalRows <= NeighborsCount + 4)
      return;

   // compute Lorentzian distances
   double distances[];
   ArrayResize(distances, 0);
   int predictions[];
   ArrayResize(predictions, 0);

   double lastDistance = -1.0;
   for(int i = 4; i < totalRows; i++) // skip bars without label
   {
      if(i % 4 != 0) continue; // enforce spacing every 4 bars
      double d = MathLog(1 + MathAbs(rsi - rows[i].rsi)) +
                 MathLog(1 + MathAbs(adx - rows[i].adx));
      if(d >= lastDistance)
      {
         lastDistance = d;
         ArrayPush(distances, d);
         ArrayPush(predictions, rows[i].label);
         if(ArraySize(predictions) > NeighborsCount)
         {
            lastDistance = distances[int(NeighborsCount*3/4)];
            ArrayRemove(distances, 0);
            ArrayRemove(predictions, 0);
         }
      }
   }

   // aggregate prediction
   int sum = 0;
   for(int i = 0; i < ArraySize(predictions); ++i)
      sum += predictions[i];
   int signal = 0;
   if(sum > 0) signal = 1; else if(sum < 0) signal = -1;

   ManageTrades(signal);
}

void ManageTrades(int signal)
{
   bool hasPosition = PositionSelect(_Symbol);
   int direction = 0;
   if(hasPosition)
      direction = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? 1 : -1;

   double lot = CalculateLot();

   if(signal > 0 && (!hasPosition || direction < 0))
   {
      if(hasPosition)
         trade.PositionClose(_Symbol);
      double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl = (StopLossPoints > 0)   ? price - StopLossPoints*_Point   : 0.0;
      double tp = (TakeProfitPoints > 0)? price + TakeProfitPoints*_Point  : 0.0;
      if(trade.Buy(lot, NULL, 0.0, sl, tp))
         SendReport("buy");
   }
   else if(signal < 0 && (!hasPosition || direction > 0))
   {
      if(hasPosition)
         trade.PositionClose(_Symbol);
      double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl = (StopLossPoints > 0)   ? price + StopLossPoints*_Point   : 0.0;
      double tp = (TakeProfitPoints > 0)? price - TakeProfitPoints*_Point  : 0.0;
      if(trade.Sell(lot, NULL, 0.0, sl, tp))
         SendReport("sell");
   }
}

double CalculateLot()
{
   if(StopLossPoints <= 0)
      return(Lots);

   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney = balance * RiskPerTrade / 100.0;
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double pointValue = tickValue / tickSize * _Point;
   double slMoney   = StopLossPoints * pointValue;
   if(slMoney <= 0)
      return(Lots);
   double lot = riskMoney / slMoney;
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double step   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lot = MathMax(minLot, MathMin(maxLot, lot));
   lot = MathFloor(lot/step)*step;
   return(lot);
}

void ApplyTrailingStop()
{
   if(TrailingStopPoints <= 0)
      return;
   if(!PositionSelect(_Symbol))
      return;

   double type = PositionGetInteger(POSITION_TYPE);
   double sl   = PositionGetDouble(POSITION_SL);
   double tp   = PositionGetDouble(POSITION_TP);

   if(type == POSITION_TYPE_BUY)
   {
      double newSL = SymbolInfoDouble(_Symbol, SYMBOL_BID) - TrailingStopPoints*_Point;
      if(newSL > sl)
         trade.PositionModify(_Symbol, newSL, tp);
   }
   else if(type == POSITION_TYPE_SELL)
   {
      double newSL = SymbolInfoDouble(_Symbol, SYMBOL_ASK) + TrailingStopPoints*_Point;
      if(sl == 0 || newSL < sl)
         trade.PositionModify(_Symbol, newSL, tp);
   }
}

void SendReport(string action)
{
   string json = StringFormat("{\"symbol\":\"%s\",\"action\":\"%s\"}", _Symbol, action);
   char post[]; StringToCharArray(json, post);
   char result[];
   string headers = "Content-Type: application/json\r\n";
   int timeout = 5000;
   string resHeaders;

   for(int i=0;i<3;i++)
   {
      ResetLastError();
      int status = WebRequest("POST", SupabaseURL, headers, timeout, post, result, resHeaders);
      if(status == -1)
      {
         PrintFormat("WebRequest error %d on attempt %d", GetLastError(), i+1);
         Sleep(1000);
         continue;
      }
      if(status != 200)
      {
         PrintFormat("HTTP status %d on attempt %d", status, i+1);
         Sleep(1000);
         continue;
      }
      Print("Report sent: ", json);
      break;
   }
}

void OnDeinit(const int reason)
{
   // nothing to clean up
}

