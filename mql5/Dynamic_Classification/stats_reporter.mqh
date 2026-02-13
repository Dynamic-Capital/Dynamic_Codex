#pragma once
#include "config.mqh"
#include "logger.mqh"
//+------------------------------------------------------------------+
//| Send account performance stats                                   |
//+------------------------------------------------------------------+
void SendReport(string action)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd      = 100.0*(balance-equity)/MathMax(balance,1.0);
   string timestamp = TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS);
   StringReplace(timestamp," ","T");
   timestamp += "Z";

   string json = StringFormat(
      "{\"symbol\":\"%s\",\"action\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"drawdown\":%.2f,\"timestamp\":\"%s\"}",
      _Symbol,action,balance,equity,dd,timestamp);

   char post[]; StringToCharArray(json,post);
   char result[];
   string headers = "Content-Type: application/json\r\n";
   int res = WebRequest("POST",ReportURL,headers,RequestTimeout,post,result,NULL);
   if(res==-1)
      Log(StringFormat("WebRequest error: %d",GetLastError()));
   else
      Log(StringFormat("Report sent: %s",json));
}
