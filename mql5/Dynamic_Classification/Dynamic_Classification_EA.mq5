// This source code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// ©jdehorty
#property copyright "2024"
#property version   "1.00"
#property strict

#include "config.mqh"
#include "utils.mqh"
#include "logger.mqh"
#include "session_filter.mqh"
#include "equity_protection.mqh"
#include "strategy_logic.mqh"
#include "position_manager.mqh"

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   InitStrategy();
   EventSetTimer(300); // send heartbeat every 5 minutes
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
//| Timer event                                                       |
//+------------------------------------------------------------------+
void OnTimer()
{
   SendReport("heartbeat");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
datetime lastBarTime=0;
void OnTick()
{
   if(!IsNewBar(lastBarTime)) return;
   if(!SessionAllowed()) return;
   if(!AllowEquity()) return;

   int action = EvaluateAction();
   ManageAction(action);
}
