#property copyright "2024"
#property version   "1.00"
#property strict

#include "config.mqh"
#include "session_filter.mqh"
#include "stats_reporter.mqh"
#include "risk_management.mqh"
#include "strategy_logic.mqh"

int OnInit()
{
   return StrategyInit();
}

void OnTick()
{
   if(!SessionAllow())
      return;
   StrategyOnTick();
}

void OnDeinit(const int reason)
{
   StrategyDeinit();
}
