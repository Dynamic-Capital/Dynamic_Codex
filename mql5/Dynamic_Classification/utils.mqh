#pragma once
//+------------------------------------------------------------------+
//| Common helper functions                                          |
//+------------------------------------------------------------------+

double Pip()
{
   return (SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==3 || SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==5) ? _Point*10 : _Point;
}

bool IsNewBar(datetime &lastTime)
{
   if(Time[0]==lastTime) return false;
   lastTime = Time[0];
   return true;
}
