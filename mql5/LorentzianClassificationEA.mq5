#property copyright "2024"
#property version   "1.00"
#property strict

// Simplified port of the "Lorentzian Classification" Pine Script indicator
// Implements a basic KNN classifier using Lorentzian distance on RSI and ADX features.
// Opens trades based on predicted direction and reports actions to Supabase via WebRequest.

#include <Trade/Trade.mqh>
CTrade trade;

input int    NeighborsCount = 8;     // number of neighbors to consider
input int    MaxBarsBack     = 2000;  // max history size
input int    RSI_Period      = 14;    // feature 1
input int    ADX_Period      = 14;    // feature 2
input double Lots            = 0.10;  // lot size for orders

string SupabaseURL = "https://xyz.supabase.co/functions/v1/ea-report"; // replace with your endpoint

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
   return(INIT_SUCCEEDED);
}

void OnTick()
{
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

   if(signal > 0 && (!hasPosition || direction < 0))
   {
      if(hasPosition) trade.PositionClose(_Symbol);
      if(trade.Buy(Lots))
         SendReport("buy");
   }
   else if(signal < 0 && (!hasPosition || direction > 0))
   {
      if(hasPosition) trade.PositionClose(_Symbol);
      if(trade.Sell(Lots))
         SendReport("sell");
   }
}

bool SendReport(string action)
{
   string json = StringFormat("{\"symbol\":\"%s\",\"action\":\"%s\"}", _Symbol, action);
   char post[]; StringToCharArray(json, post);
   char result[];
   string headers = "Content-Type: application/json\r\n";
   string resultHeaders;
   int timeout = 5000;
   int status = WebRequest("POST", SupabaseURL, headers, timeout, post, result, resultHeaders);
   string body = CharArrayToString(result);
   if(status == -1)
   {
      Print("WebRequest error: ", GetLastError());
      return false;
   }

   string message = "";
   int pos = StringFind(body, "\"message\"");
   if(pos != -1)
   {
      int start = StringFind(body, "\"", pos + 9);
      if(start != -1)
      {
         start++;
         int end = StringFind(body, "\"", start);
         if(end != -1)
            message = StringSubstr(body, start, end - start);
      }
   }

   if(status < 200 || status >= 300)
   {
      PrintFormat("HTTP error %d: %s", status, body);
      return false;
   }

   PrintFormat("Report sent [%d]: %s", status, message);
   return true;
}

void OnDeinit(const int reason)
{
   // nothing to clean up
}

