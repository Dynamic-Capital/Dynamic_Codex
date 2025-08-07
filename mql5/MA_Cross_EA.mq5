// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// ©jdehorty
#property copyright "2024"
#property version   "1.00"
#property strict

// Simple Moving Average crossover EA template
// Sends trade updates to a Supabase Edge Function via WebRequest

input int    FastMA        = 9;
input int    SlowMA        = 21;
input double RiskPercent   = 1.0;   // risk per trade in percent
input int    StopLossPips  = 50;
input int    TakeProfitPips= 100;
input string ReportURL     = "https://xyz.supabase.co/functions/v1/ea-report"; // replace with your endpoint
input int    RequestTimeout = 5000;

#include <Trade/Trade.mqh>
CTrade trade;

int fastHandle;
int slowHandle;

//+------------------------------------------------------------------+
//| Calculate lot size based on risk percentage and SL in pips       |
//+------------------------------------------------------------------+
double CalculateLot(double stopPips, double riskPercent)
{
   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double risk      = balance * (riskPercent/100.0);
   double tickVal   = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double pipValue  = tickVal / tickSize * (SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==3 || SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==5 ? 10.0 : 1.0);
   double slValuePerLot = stopPips * pipValue;
   double lots = risk / slValuePerLot;
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lots = MathMax(minLot, MathFloor(lots/lotStep)*lotStep);
   return lots;
}

int OnInit()
{
   fastHandle = iMA(_Symbol, PERIOD_CURRENT, FastMA, 0, MODE_EMA, PRICE_CLOSE);
   slowHandle = iMA(_Symbol, PERIOD_CURRENT, SlowMA, 0, MODE_EMA, PRICE_CLOSE);
   if(fastHandle == INVALID_HANDLE || slowHandle == INVALID_HANDLE)
   {
      Print("Failed to create MA handles: ", GetLastError());
      return INIT_FAILED;
   }
   EventSetTimer(300);
   return INIT_SUCCEEDED;
}

void OnTick()
{
   double fast[2];
   double slow[2];
   if(CopyBuffer(fastHandle,0,0,2,fast) <= 0) return;
   if(CopyBuffer(slowHandle,0,0,2,slow) <= 0) return;

   bool crossUp   = fast[1] < slow[1] && fast[0] > slow[0];
   bool crossDown = fast[1] > slow[1] && fast[0] < slow[0];

   double lot = CalculateLot(StopLossPips, RiskPercent);
   double pip = (SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==3 || SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==5) ? _Point*10 : _Point;

   if(crossUp)
   {
      if(PositionSelect(_Symbol))
         if(trade.PositionClose(_Symbol)) SendReport("close");
      double sl = NormalizeDouble(Ask - StopLossPips*pip, _Digits);
      double tp = NormalizeDouble(Ask + TakeProfitPips*pip, _Digits);
      if(trade.Buy(lot,_Symbol,Ask,sl,tp))
         SendReport("buy");
      else
         Print("Buy order failed: ", GetLastError());
   }
   else if(crossDown)
   {
      if(PositionSelect(_Symbol))
         if(trade.PositionClose(_Symbol)) SendReport("close");
      double sl = NormalizeDouble(Bid + StopLossPips*pip, _Digits);
      double tp = NormalizeDouble(Bid - TakeProfitPips*pip, _Digits);
      if(trade.Sell(lot,_Symbol,Bid,sl,tp))
         SendReport("sell");
      else
         Print("Sell order failed: ", GetLastError());
   }
}

void SendReport(string action)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd      = 100.0*(balance - equity)/MathMax(balance,1.0);
   string timestamp = TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS);
   StringReplace(timestamp," ","T");
   timestamp += "Z";

   string json = StringFormat(
      "{\"symbol\":\"%s\",\"action\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"drawdown\":%.2f,\"timestamp\":\"%s\"}",
      _Symbol,action,balance,equity,dd,timestamp);

   char post[]; StringToCharArray(json, post);
   char result[];
   string headers = "Content-Type: application/json\r\n";
   int res = WebRequest("POST", ReportURL, headers, RequestTimeout, post, result, NULL);
   if(res == -1)
      Print("WebRequest error: ", GetLastError());
   else
      Print("Report sent: ", json);
}

void OnDeinit(const int reason)
{
   IndicatorRelease(fastHandle);
   IndicatorRelease(slowHandle);
   EventKillTimer();
}

void OnTimer()
{
   SendReport("heartbeat");
}
