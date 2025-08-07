#pragma once
//+------------------------------------------------------------------+
//| core/Settings.mqh                                                 |
//| Handles input grouping and configuration overrides                |
//+------------------------------------------------------------------+
struct EASettings
  {
   int    Neighbors=8;
   int    FeatureCount=5;
   double RiskPerTrade=0.5;    // %
   double DailyLossCap=3.0;    // %
   double MaxExposurePct=6.0;  // sum of active risk
   bool   UseSessionFilter=true, UseNewsFilter=true, UseKernel=true;
   // ... additional parameters
   void   LoadFromIni(const string path);
  };
