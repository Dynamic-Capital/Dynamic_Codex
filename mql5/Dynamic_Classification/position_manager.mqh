#pragma once
#include <Trade/Trade.mqh>
#include "config.mqh"
#include "risk_management.mqh"
#include "utils.mqh"
#include "stats_reporter.mqh"
#include "logger.mqh"
//+------------------------------------------------------------------+
//| Position handling                                                 |
//+------------------------------------------------------------------+
CTrade trade;

bool HasPosition()
{
   return PositionSelect(_Symbol);
}

void ClosePosition()
{
   if(HasPosition())
   {
      if(trade.PositionClose(_Symbol))
         SendReport("close");
   }
}

void OpenBuy()
{
   double lot = CalculateLot(StopLossPips, RiskPercent);
   double p = Pip();
   double sl = NormalizeDouble(Ask - StopLossPips*p, _Digits);
   double tp = NormalizeDouble(Ask + TakeProfitPips*p, _Digits);
   if(trade.Buy(lot,_Symbol,Ask,sl,tp))
      SendReport("buy");
   else
      Log(StringFormat("Buy failed: %d",GetLastError()));
}

void OpenSell()
{
   double lot = CalculateLot(StopLossPips, RiskPercent);
   double p = Pip();
   double sl = NormalizeDouble(Bid + StopLossPips*p, _Digits);
   double tp = NormalizeDouble(Bid - TakeProfitPips*p, _Digits);
   if(trade.Sell(lot,_Symbol,Bid,sl,tp))
      SendReport("sell");
   else
      Log(StringFormat("Sell failed: %d",GetLastError()));
}

void ManageAction(int action)
{
   if(action==1 && !HasPosition())
      OpenBuy();
   else if(action==-1 && !HasPosition())
      OpenSell();
   else if(action==2 && HasPosition() && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
      ClosePosition();
   else if(action==-2 && HasPosition() && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
      ClosePosition();
}
