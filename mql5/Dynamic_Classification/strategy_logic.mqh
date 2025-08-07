#pragma once
#include "config.mqh"
#include "utils.mqh"
#include "logger.mqh"
//+------------------------------------------------------------------+
//| Strategy logic: feature calc and Lorentzian KNN classification    |
//+------------------------------------------------------------------+

double f1Arr[],f2Arr[],f3Arr[],f4Arr[],f5Arr[];
int    labelArr[];
double wtBuffer[];
int    lastSignal=0;
int    barsHeld=0;

// indicator handles for bulk data retrieval
int hF1=INVALID_HANDLE;
int hF3=INVALID_HANDLE;
int hF4=INVALID_HANDLE;
int hF5=INVALID_HANDLE;
int hEMA=INVALID_HANDLE;
int hSMA=INVALID_HANDLE;
int hAdxFilter=INVALID_HANDLE;

double GetFeature1(int shift){ return (shift < ArraySize(f1Arr)) ? f1Arr[ArraySize(f1Arr)-1-shift] : 0; }
double GetFeature2(int shift){ return (shift < ArraySize(wtBuffer)) ? wtBuffer[shift] : 0; }
double GetFeature3(int shift){ return (shift < ArraySize(f3Arr)) ? f3Arr[ArraySize(f3Arr)-1-shift] : 0; }
double GetFeature4(int shift){ return (shift < ArraySize(f4Arr)) ? f4Arr[ArraySize(f4Arr)-1-shift] : 0; }
double GetFeature5(int shift){ return (shift < ArraySize(f5Arr)) ? f5Arr[ArraySize(f5Arr)-1-shift] : 0; }

void ComputeWaveTrend(int channelLen,int avgLen)
{
   int bars=MathMin(Bars-1,MaxBarsBack+50);
   ArrayResize(wtBuffer,bars);
   double alpha1=2.0/(channelLen+1);
   double alpha2=2.0/(avgLen+1);
   double esa=0,d=0,ci=0,tci=0;
   for(int i=bars-1;i>=0;i--)
   {
      double price=(High[i]+Low[i]+Close[i])/3.0;
      esa=alpha1*price+(1-alpha1)*esa;
      d  =alpha1*MathAbs(price-esa)+(1-alpha1)*d; if(d==0) d=1e-6;
      ci =(price-esa)/(0.015*d);
      tci=alpha2*ci+(1-alpha2)*tci;
      wtBuffer[i]=tci;
   }
}

void BuildTrainingSets()
{
   int total=MathMin(MaxBarsBack,Bars-5);
   ArrayResize(f1Arr,total);
   ArrayResize(f2Arr,total);
   ArrayResize(f3Arr,total);
   ArrayResize(f4Arr,total);
   ArrayResize(f5Arr,total);
   ArrayResize(labelArr,total);

   // pull indicator data in bulk for efficiency
   double buf1[],buf3[],buf4[],buf5[];
   CopyBuffer(hF1,0,0,total,buf1);
   CopyBuffer(hF3,0,0,total,buf3);
   CopyBuffer(hF4,0,0,total,buf4);
   CopyBuffer(hF5,0,0,total,buf5);

   for(int idx=0;idx<total;idx++)
   {
      int shift=total-1-idx;
      f1Arr[idx]=buf1[shift];
      f2Arr[idx]=GetFeature2(shift);
      f3Arr[idx]=buf3[shift];
      f4Arr[idx]=buf4[shift];
      f5Arr[idx]=buf5[shift];
      double future=Close[shift+4];
      double current=Close[shift];
      if(future>current) labelArr[idx]=1;
      else if(future<current) labelArr[idx]=-1;
      else labelArr[idx]=0;
   }
}

double LorentzianDistance(int i,double c1,double c2,double c3,double c4,double c5)
{
   double d=0.0;
   d+=MathLog(1+MathAbs(c1-f1Arr[i]));
   d+=MathLog(1+MathAbs(c2-f2Arr[i]));
   if(FeatureCount>=3) d+=MathLog(1+MathAbs(c3-f3Arr[i]));
   if(FeatureCount>=4) d+=MathLog(1+MathAbs(c4-f4Arr[i]));
   if(FeatureCount>=5) d+=MathLog(1+MathAbs(c5-f5Arr[i]));
   return d;
}

double RationalQuadratic(int shift)
{
   double num=0,den=0;
   for(int i=0;i<KernelH;i++)
   {
      double dist=i+shift;
      double w=MathPow(1+(dist*dist)/(2*KernelR*KernelH*KernelH),-KernelR);
      num+=Close[i+shift]*w;
      den+=w;
   }
   return den==0?0:num/den;
}

double GaussianEstimate(int shift,int h)
{
   double num=0,den=0;
   for(int i=0;i<h;i++)
   {
      double dist=i+shift;
      double w=MathExp(-(dist*dist)/(2.0*h*h));
      num+=Close[i+shift]*w;
      den+=w;
   }
   return den==0?0:num/den;
}

void InitStrategy()
{
   // create indicator handles once
   hF1=iRSI(_Symbol,PERIOD_CURRENT,F1_RSI_Period,PRICE_CLOSE);
   hF3=iCCI(_Symbol,PERIOD_CURRENT,F3_CCI_Period,PRICE_TYPICAL);
   hF4=iADX(_Symbol,PERIOD_CURRENT,F4_ADX_Period);
   hF5=iRSI(_Symbol,PERIOD_CURRENT,F5_RSI_Period,PRICE_CLOSE);
   if(UseEmaFilter) hEMA=iMA(_Symbol,PERIOD_CURRENT,EmaPeriod,0,MODE_EMA,PRICE_CLOSE);
   if(UseSmaFilter) hSMA=iMA(_Symbol,PERIOD_CURRENT,SmaPeriod,0,MODE_SMA,PRICE_CLOSE);
   hAdxFilter=iADX(_Symbol,PERIOD_CURRENT,14);

   ComputeWaveTrend(F2_WT_Channel,F2_WT_Avg);
   BuildTrainingSets();
   lastSignal=0;
   barsHeld=0;
}

void DeinitStrategy()
{
   if(hF1!=INVALID_HANDLE) IndicatorRelease(hF1);
   if(hF3!=INVALID_HANDLE) IndicatorRelease(hF3);
   if(hF4!=INVALID_HANDLE) IndicatorRelease(hF4);
   if(hF5!=INVALID_HANDLE) IndicatorRelease(hF5);
   if(hEMA!=INVALID_HANDLE) IndicatorRelease(hEMA);
   if(hSMA!=INVALID_HANDLE) IndicatorRelease(hSMA);
    if(hAdxFilter!=INVALID_HANDLE) IndicatorRelease(hAdxFilter);
}

int EvaluateAction()
{
   // grab latest feature values from buffers
   double val[1];
   CopyBuffer(hF1,0,0,1,val); double c1=val[0];
   double c2=GetFeature2(0);
   CopyBuffer(hF3,0,0,1,val); double c3=val[0];
   CopyBuffer(hF4,0,0,1,val); double c4=val[0];
   CopyBuffer(hF5,0,0,1,val); double c5=val[0];

   int total=ArraySize(labelArr);
   int k=NeighborsCount;
   double bestDist[]; ArrayResize(bestDist,k); for(int j=0;j<k;j++) bestDist[j]=DBL_MAX;
   int bestLabel[]; ArrayResize(bestLabel,k); for(int j=0;j<k;j++) bestLabel[j]=0;
   for(int i=0;i<total;i++)
   {
      double d=LorentzianDistance(i,c1,c2,c3,c4,c5);
      int worst=0; double worstVal=bestDist[0];
      for(int j=1;j<k;j++) if(bestDist[j]>worstVal){worstVal=bestDist[j];worst=j;}
      if(d<worstVal){bestDist[worst]=d;bestLabel[worst]=labelArr[i];}
   }
   int prediction=0; for(int j=0;j<k;j++) prediction+=bestLabel[j];

   // filter data via cached handles
   CopyBuffer(hAdxFilter,0,0,1,val); bool adxFilter=!UseAdxFilter || val[0] > AdxThreshold;
   double emaVal=0,smaVal=0;
   if(UseEmaFilter){ CopyBuffer(hEMA,0,0,1,val); emaVal=val[0]; }
   if(UseSmaFilter){ CopyBuffer(hSMA,0,0,1,val); smaVal=val[0]; }
   bool emaUp=!UseEmaFilter || Close[0] > emaVal;
   bool emaDown=!UseEmaFilter || Close[0] < emaVal;
   bool smaUp=!UseSmaFilter || Close[0] > smaVal;
   bool smaDown=!UseSmaFilter || Close[0] < smaVal;

   double yhat1=RationalQuadratic(0);
   double yhat1_p1=RationalQuadratic(1);
   double yhat1_p2=RationalQuadratic(2);
   double yhat2=GaussianEstimate(0,KernelH-KernelLag);
   double yhat2_p1=GaussianEstimate(1,KernelH-KernelLag);
   bool wasBearishRate=yhat1_p2>yhat1_p1;
   bool wasBullishRate=yhat1_p2<yhat1_p1;
   bool isBearishRate=yhat1_p1>yhat1;
   bool isBullishRate=yhat1_p1<yhat1;
   bool isBearishChange=isBearishRate && wasBullishRate;
   bool isBullishChange=isBullishRate && wasBearishRate;
   bool isBullish=!UseKernelFilter || (yhat2>=yhat1);
   bool isBearish=!UseKernelFilter || (yhat2<=yhat1);

   bool filtersAll=adxFilter;
   int signal=(prediction>0 && filtersAll)?1:(prediction<0 && filtersAll?-1:lastSignal);
   bool isNewBuySignal=(signal==1 && lastSignal!=1);
   bool isNewSellSignal=(signal==-1 && lastSignal!=-1);
   bool startLongTrade=isNewBuySignal && isBullish && emaUp && smaUp;
   bool startShortTrade=isNewSellSignal && isBearish && emaDown && smaDown;
   barsHeld=(signal!=lastSignal)?0:barsHeld+1;
   bool isHeldFourBars=barsHeld>=4;
   bool endLongTradeStrict=(lastSignal==1) && (isNewSellSignal || isHeldFourBars);
   bool endShortTradeStrict=(lastSignal==-1) && (isNewBuySignal || isHeldFourBars);
   bool endLongTradeDynamic=(lastSignal==1) && isBearishChange;
   bool endShortTradeDynamic=(lastSignal==-1) && isBullishChange;
   bool endLongTrade=UseDynamicExits?endLongTradeDynamic:endLongTradeStrict;
   bool endShortTrade=UseDynamicExits?endShortTradeDynamic:endShortTradeStrict;

   lastSignal=signal;
   if(startLongTrade) return 1;
   if(startShortTrade) return -1;
   if(endLongTrade) return 2;
   if(endShortTrade) return -2;
   return 0;
}
