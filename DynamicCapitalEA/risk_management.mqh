#pragma once

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
