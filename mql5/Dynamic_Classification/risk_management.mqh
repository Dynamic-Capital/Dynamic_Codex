#pragma once
#include "config.mqh"
#include "utils.mqh"
//+------------------------------------------------------------------+
//| Calculate lot size based on risk percent and stop loss           |
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
