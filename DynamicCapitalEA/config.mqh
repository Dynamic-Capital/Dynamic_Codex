#pragma once
#include <Trade/Trade.mqh>

input int    NeighborsCount = 8;     // number of neighbors to consider
input int    MaxBarsBack     = 2000;  // max history size
input int    RSI_Period      = 14;    // feature 1
input int    ADX_Period      = 14;    // feature 2
input double Lots            = 0.10;  // lot size for orders

string SupabaseURL = "https://xyz.supabase.co/functions/v1/ea-report"; // replace with your endpoint

struct FeatureRow
{
   double rsi;
   double adx;
   int    label; // 1 long, -1 short, 0 neutral
};

FeatureRow rows[];
int totalRows = 0;

int lastProcessedBar = -1;
