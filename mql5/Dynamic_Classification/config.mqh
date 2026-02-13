#pragma once
//+------------------------------------------------------------------+
//| Input parameters and configuration                               |
//+------------------------------------------------------------------+
input int    NeighborsCount   = 8;       // number of neighbors
input int    MaxBarsBack      = 2000;    // maximum bars of history
input bool   UseDynamicExits  = false;   // use kernel based exits
input int    FeatureCount     = 5;       // number of features

// feature parameters (RSI, WT, CCI, ADX, RSI)
input int    F1_RSI_Period    = 14;
input int    F2_WT_Channel    = 10;
input int    F2_WT_Avg        = 11;
input int    F3_CCI_Period    = 20;
input int    F4_ADX_Period    = 20;
input int    F5_RSI_Period    = 9;

// filters
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
input double RiskPercent   = 1.0;     // risk per trade in percent
input int    StopLossPips   = 50;
input int    TakeProfitPips = 100;
input string ReportURL      = "https://yourdomain.com/api/ea-report";
input int    RequestTimeout = 5000;

// session filter
input bool   UseSessionFilter = false;
input int    SessionStartHour = 0;
input int    SessionEndHour   = 24;

// equity protection
input double MaxDrawdown = 20.0; // percent
