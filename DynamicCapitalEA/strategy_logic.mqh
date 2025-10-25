#pragma once

int StrategyInit()
{
   ArrayResize(rows, MaxBarsBack);
   return INIT_SUCCEEDED;
}

void StrategyOnTick()
{
   int currentBar = iBars(_Symbol, PERIOD_CURRENT);
   if(currentBar == lastProcessedBar)
      return;
   lastProcessedBar = currentBar;

   double rsi = iRSI(_Symbol, PERIOD_CURRENT, RSI_Period, PRICE_CLOSE, 0);
   double adx = iADX(_Symbol, PERIOD_CURRENT, ADX_Period, 0, PRICE_CLOSE, 0);

   if(totalRows < MaxBarsBack)
      totalRows++;
   for(int i = totalRows-1; i > 0; --i)
      rows[i] = rows[i-1];
   rows[0].rsi = rsi;
   rows[0].adx = adx;
   rows[0].label = 0;

   if(totalRows > 4)
   {
      double futureClose = iClose(_Symbol, PERIOD_CURRENT, 0);
      double pastClose   = iClose(_Symbol, PERIOD_CURRENT, 4);
      rows[4].label = (futureClose > pastClose) ? 1 : (futureClose < pastClose ? -1 : 0);
   }

   if(totalRows <= NeighborsCount + 4)
      return;

   double distances[];
   ArrayResize(distances, 0);
   int predictions[];
   ArrayResize(predictions, 0);

   double lastDistance = -1.0;
   for(int i = 4; i < totalRows; i++)
   {
      if(i % 4 != 0) continue;
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

   int sum = 0;
   for(int i = 0; i < ArraySize(predictions); ++i)
      sum += predictions[i];
   int signal = 0;
   if(sum > 0) signal = 1; else if(sum < 0) signal = -1;

   ManageTrades(signal);
}

void StrategyDeinit()
{
}
