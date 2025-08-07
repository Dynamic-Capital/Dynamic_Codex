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

double GetFeature1(int shift){ return iRSI(_Symbol,PERIOD_CURRENT,F1_RSI_Period,PRICE_CLOSE,shift); }
double GetFeature2(int shift){ return (shift < ArraySize(wtBuffer)) ? wtBuffer[shift] : 0; }
double GetFeature3(int shift){ return iCCI(_Symbol,PERIOD_CURRENT,F3_CCI_Period,PRICE_TYPICAL,shift); }
double GetFeature4(int shift){ return iADX(_Symbol,PERIOD_CURRENT,F4_ADX_Period,PRICE_CLOSE,MODE_MAIN,shift); }
double GetFeature5(int shift){ return iRSI(_Symbol,PERIOD_CURRENT,F5_RSI_Period,PRICE_CLOSE,shift); }

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
   for(int i=total-1;i>=0;i--)
   {
      int idx=total-1-i;
      f1Arr[idx]=GetFeature1(i);
      f2Arr[idx]=GetFeature2(i);
      f3Arr[idx]=GetFeature3(i);
      f4Arr[idx]=GetFeature4(i);
      f5Arr[idx]=GetFeature5(i);
      double future=Close[i+4];
      double current=Close[i];
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
   ComputeWaveTrend(F2_WT_Channel,F2_WT_Avg);
   BuildTrainingSets();
   lastSignal=0;
   barsHeld=0;
}

int EvaluateAction()
{
   double c1=GetFeature1(0);
   double c2=GetFeature2(0);
   double c3=GetFeature3(0);
   double c4=GetFeature4(0);
   double c5=GetFeature5(0);

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

   bool adxFilter=!UseAdxFilter || iADX(_Symbol,PERIOD_CURRENT,14,PRICE_CLOSE,MODE_MAIN,0) > AdxThreshold;
   bool emaUp=!UseEmaFilter || Close[0] > iMA(_Symbol,PERIOD_CURRENT,EmaPeriod,0,MODE_EMA,PRICE_CLOSE,0);
   bool emaDown=!UseEmaFilter || Close[0] < iMA(_Symbol,PERIOD_CURRENT,EmaPeriod,0,MODE_EMA,PRICE_CLOSE,0);
   bool smaUp=!UseSmaFilter || Close[0] > iMA(_Symbol,PERIOD_CURRENT,SmaPeriod,0,MODE_SMA,PRICE_CLOSE,0);
   bool smaDown=!UseSmaFilter || Close[0] < iMA(_Symbol,PERIOD_CURRENT,SmaPeriod,0,MODE_SMA,PRICE_CLOSE,0);

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
