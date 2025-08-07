// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// ©jdehorty
#property copyright "2024"
#property version   "1.00"
#property strict

//+------------------------------------------------------------------+
//| Expert Advisor: Lorentzian Classification                        |
//| Converted from TradingView Pine Script                           |
//| Implements Lorentzian-distance KNN classification with optional  |
//| filters and kernel-based exits.                                  |
//+------------------------------------------------------------------+

#include <Trade/Trade.mqh>
CTrade trade;

//--- input parameters ------------------------------------------------
input int    NeighborsCount   = 8;       // number of neighbors
input int    MaxBarsBack      = 2000;    // maximum bars of history
input bool   UseDynamicExits  = false;   // use kernel based exits
input int    FeatureCount     = 5;       // number of features in distance calc

// feature parameters (fixed mapping: RSI, WT, CCI, ADX, RSI)
input int    F1_RSI_Period    = 14;
input int    F2_WT_Channel    = 10;
input int    F2_WT_Avg        = 11;
input int    F3_CCI_Period    = 20;
input int    F4_ADX_Period    = 20;
input int    F5_RSI_Period    = 9;

// filter parameters
input bool   UseAdxFilter = false;
input int    AdxThreshold = 20;
input bool   UseEmaFilter = false;
input int    EmaPeriod    = 200;
input bool   UseSmaFilter = false;
input int    SmaPeriod    = 200;

// kernel regression parameters
input bool   UseKernelFilter = true;
input int    KernelH   = 8;
input double KernelR   = 8.0;
input int    KernelX   = 25;
input int    KernelLag = 2;

// risk management and reporting
input string ReportURL     = "https://yourdomain.com/api/ea-report";
input int    RequestTimeout = 5000;
input double RiskPercent   = 1.0;     // risk per trade in percent

//--- global variables -------------------------------------------------
double f1Arr[], f2Arr[], f3Arr[], f4Arr[], f5Arr[];  // feature arrays
int    labelArr[];                                   // training labels

int    lastSignal = 0;                               // previous signal
int    barsHeld   = 0;                               // bars in trade

datetime lastBarTime = 0;

double wtBuffer[];                                   // WaveTrend buffer

//+------------------------------------------------------------------+
//| Utility: calculate lot size for given risk percent and SL in pips |
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

//+------------------------------------------------------------------+
//| WaveTrend calculation for entire history                         |
//+------------------------------------------------------------------+
void ComputeWaveTrend(int channelLen, int avgLen, double &out[])
{
   int bars = MathMin(Bars-1, MaxBarsBack+50);
   ArrayResize(out, bars);
   double alpha1 = 2.0/(channelLen+1);
   double alpha2 = 2.0/(avgLen+1);
   double esa=0, d=0, ci=0, tci=0;
   for(int i=bars-1; i>=0; i--)
   {
      double price = (High[i] + Low[i] + Close[i]) / 3.0;
      esa = alpha1*price + (1-alpha1)*esa;
      d   = alpha1*MathAbs(price - esa) + (1-alpha1)*d;
      if(d==0) d=1e-6;
      ci  = (price - esa)/(0.015*d);
      tci = alpha2*ci + (1-alpha2)*tci;
      out[i] = tci;
   }
}

//+------------------------------------------------------------------+
//| Retrieve feature value for a given bar shift                     |
//+------------------------------------------------------------------+
double GetFeature1(int shift){ return iRSI(_Symbol, PERIOD_CURRENT, F1_RSI_Period, PRICE_CLOSE, shift); }
double GetFeature2(int shift){ return (shift < ArraySize(wtBuffer)) ? wtBuffer[shift] : 0; }
double GetFeature3(int shift){ return iCCI(_Symbol, PERIOD_CURRENT, F3_CCI_Period, PRICE_TYPICAL, shift); }
double GetFeature4(int shift){ return iADX(_Symbol, PERIOD_CURRENT, F4_ADX_Period, PRICE_CLOSE, MODE_MAIN, shift); }
double GetFeature5(int shift){ return iRSI(_Symbol, PERIOD_CURRENT, F5_RSI_Period, PRICE_CLOSE, shift); }

//+------------------------------------------------------------------+
//| Build training feature and label arrays                          |
//+------------------------------------------------------------------+
void BuildTrainingSets()
{
   int total = MathMin(MaxBarsBack, Bars-5);
   ArrayResize(f1Arr, total);
   ArrayResize(f2Arr, total);
   ArrayResize(f3Arr, total);
   ArrayResize(f4Arr, total);
   ArrayResize(f5Arr, total);
   ArrayResize(labelArr, total);

   for(int i=total-1; i>=0; i--)
   {
      int idx = total-1 - i;            // oldest at index 0
      f1Arr[idx] = GetFeature1(i);
      f2Arr[idx] = GetFeature2(i);
      f3Arr[idx] = GetFeature3(i);
      f4Arr[idx] = GetFeature4(i);
      f5Arr[idx] = GetFeature5(i);
      double future = Close[i+4];
      double current = Close[i];
      if(future > current) labelArr[idx] = 1;
      else if(future < current) labelArr[idx] = -1;
      else labelArr[idx] = 0;
   }
}

//+------------------------------------------------------------------+
//| Lorentzian distance between current features and bar i           |
//+------------------------------------------------------------------+
double LorentzianDistance(int i, double c1,double c2,double c3,double c4,double c5)
{
   double d = 0.0;
   d += MathLog(1+MathAbs(c1 - f1Arr[i]));
   d += MathLog(1+MathAbs(c2 - f2Arr[i]));
   if(FeatureCount>=3) d += MathLog(1+MathAbs(c3 - f3Arr[i]));
   if(FeatureCount>=4) d += MathLog(1+MathAbs(c4 - f4Arr[i]));
   if(FeatureCount>=5) d += MathLog(1+MathAbs(c5 - f5Arr[i]));
   return d;
}

//+------------------------------------------------------------------+
//| Simple Rational Quadratic kernel estimate                        |
//+------------------------------------------------------------------+
double RationalQuadratic(int shift)
{
   double num=0, den=0;
   for(int i=0;i<KernelH;i++)
   {
      double dist = i+shift;
      double w = MathPow(1 + (dist*dist)/(2*KernelR*KernelH*KernelH), -KernelR);
      num += Close[i+shift]*w;
      den += w;
   }
   return den==0?0:num/den;
}

//+------------------------------------------------------------------+
//| Simple Gaussian kernel estimate                                  |
//+------------------------------------------------------------------+
double GaussianEstimate(int shift,int h)
{
   double num=0, den=0;
   for(int i=0;i<h;i++)
   {
      double dist = i+shift;
      double w = MathExp(-(dist*dist)/(2.0*h*h));
      num += Close[i+shift]*w;
      den += w;
   }
   return den==0?0:num/den;
}

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
      Print("WebRequest error: ",GetLastError());
   else
      Print("Report sent: ",json);
}

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   ComputeWaveTrend(F2_WT_Channel, F2_WT_Avg, wtBuffer);
   BuildTrainingSets();
   lastBarTime = 0;
   EventSetTimer(300); // periodic reporting every 5 minutes
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
}

//+------------------------------------------------------------------+
//| Timer event: send periodic stats                                 |
//+------------------------------------------------------------------+
void OnTimer()
{
   SendReport("heartbeat");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   if(Time[0]==lastBarTime) return; // run once per bar
   lastBarTime = Time[0];

   //---- calculate current feature vector
   double c1 = GetFeature1(0);
   double c2 = GetFeature2(0);
   double c3 = GetFeature3(0);
   double c4 = GetFeature4(0);
   double c5 = GetFeature5(0);

   //---- KNN classification
   int total = ArraySize(labelArr);
   int k = NeighborsCount;
   double bestDist[]; ArrayResize(bestDist,k); for(int j=0;j<k;j++) bestDist[j]=DBL_MAX;
   int bestLabel[]; ArrayResize(bestLabel,k); for(int j=0;j<k;j++) bestLabel[j]=0;

   for(int i=0;i<total;i++)
   {
      double d = LorentzianDistance(i,c1,c2,c3,c4,c5);
      // find worst neighbor
      int worstIdx=0; double worstVal=bestDist[0];
      for(int j=1;j<k;j++) if(bestDist[j]>worstVal){worstVal=bestDist[j];worstIdx=j;}
      if(d < worstVal)
      {
         bestDist[worstIdx]=d;
         bestLabel[worstIdx]=labelArr[i];
      }
   }
   int prediction=0; for(int j=0;j<k;j++) prediction+=bestLabel[j];

   //---- filters ---------------------------------------------------
   bool adxFilter = !UseAdxFilter || iADX(_Symbol,PERIOD_CURRENT,14,PRICE_CLOSE,MODE_MAIN,0) > AdxThreshold;
   bool emaUp = !UseEmaFilter || Close[0] > iMA(_Symbol,PERIOD_CURRENT,EmaPeriod,0,MODE_EMA,PRICE_CLOSE,0);
   bool emaDown = !UseEmaFilter || Close[0] < iMA(_Symbol,PERIOD_CURRENT,EmaPeriod,0,MODE_EMA,PRICE_CLOSE,0);
   bool smaUp = !UseSmaFilter || Close[0] > iMA(_Symbol,PERIOD_CURRENT,SmaPeriod,0,MODE_SMA,PRICE_CLOSE,0);
   bool smaDown = !UseSmaFilter || Close[0] < iMA(_Symbol,PERIOD_CURRENT,SmaPeriod,0,MODE_SMA,PRICE_CLOSE,0);

   // kernel estimates
   double yhat1     = RationalQuadratic(0);
   double yhat1_p1  = RationalQuadratic(1);
   double yhat1_p2  = RationalQuadratic(2);
   double yhat2     = GaussianEstimate(0, KernelH-KernelLag);
   double yhat2_p1  = GaussianEstimate(1, KernelH-KernelLag);
   bool wasBearishRate = yhat1_p2 > yhat1_p1;
   bool wasBullishRate = yhat1_p2 < yhat1_p1;
   bool isBearishRate  = yhat1_p1 > yhat1;
   bool isBullishRate  = yhat1_p1 < yhat1;
   bool isBearishChange = isBearishRate && wasBullishRate;
   bool isBullishChange = isBullishRate && wasBearishRate;
   bool isBullishCross  = (yhat2_p1 < yhat1_p1) && (yhat2 > yhat1);
   bool isBearishCross  = (yhat2_p1 > yhat1_p1) && (yhat2 < yhat1);
   bool isBullish = !UseKernelFilter || (yhat2 >= yhat1);
   bool isBearish = !UseKernelFilter || (yhat2 <= yhat1);

   //---- derive signal
   bool filtersAll = adxFilter;
   int signal = (prediction>0 && filtersAll) ? 1 : (prediction<0 && filtersAll ? -1 : lastSignal);

   bool isNewBuySignal  = (signal==1 && lastSignal!=1);
   bool isNewSellSignal = (signal==-1 && lastSignal!=-1);

   bool startLongTrade  = isNewBuySignal && isBullish && emaUp && smaUp;
   bool startShortTrade = isNewSellSignal && isBearish && emaDown && smaDown;

   // bars-held tracking
   barsHeld = (signal!=lastSignal) ? 0 : barsHeld+1;
   bool isHeldFourBars = barsHeld>=4;

   bool endLongTradeStrict  = (lastSignal==1) && (isNewSellSignal || isHeldFourBars);
   bool endShortTradeStrict = (lastSignal==-1) && (isNewBuySignal || isHeldFourBars);

   bool endLongTradeDynamic  = (lastSignal==1) && isBearishChange;
   bool endShortTradeDynamic = (lastSignal==-1) && isBullishChange;

   bool endLongTrade  = UseDynamicExits ? endLongTradeDynamic  : endLongTradeStrict;
   bool endShortTrade = UseDynamicExits ? endShortTradeDynamic : endShortTradeStrict;

   //---- trade management -----------------------------------------
   double lot = CalculateLot(50, RiskPercent); // risk-based lot size
   double pip = (SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==3 || SymbolInfoInteger(_Symbol, SYMBOL_DIGITS)==5) ? _Point*10 : _Point;

   if(startLongTrade && !PositionSelect(_Symbol))
   {
      double sl = NormalizeDouble(Ask - 50*pip, _Digits);
      double tp = NormalizeDouble(Ask + 100*pip, _Digits);
      if(trade.Buy(lot,_Symbol,Ask,sl,tp)) SendReport("buy");
      else Print("Buy failed: ",GetLastError());
   }
   else if(startShortTrade && !PositionSelect(_Symbol))
   {
      double sl = NormalizeDouble(Bid + 50*pip, _Digits);
      double tp = NormalizeDouble(Bid - 100*pip, _Digits);
      if(trade.Sell(lot,_Symbol,Bid,sl,tp)) SendReport("sell");
      else Print("Sell failed: ",GetLastError());
   }

   if(endLongTrade && PositionSelect(_Symbol) && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY)
   {
      if(trade.PositionClose(_Symbol)) SendReport("close");
   }
   if(endShortTrade && PositionSelect(_Symbol) && PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)
   {
      if(trade.PositionClose(_Symbol)) SendReport("close");
   }

   lastSignal = signal;
}

