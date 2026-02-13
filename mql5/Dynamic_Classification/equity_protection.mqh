#pragma once
#include "config.mqh"
//+------------------------------------------------------------------+
//| Basic equity/drawdown protection                                  |
//+------------------------------------------------------------------+
bool AllowEquity()
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd = 100.0*(balance-equity)/MathMax(balance,1.0);
   return dd < MaxDrawdown;
}
