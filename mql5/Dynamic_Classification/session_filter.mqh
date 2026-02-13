#pragma once
#include "config.mqh"
//+------------------------------------------------------------------+
//| Session filter                                                     |
//+------------------------------------------------------------------+
bool SessionAllowed()
{
   if(!UseSessionFilter) return true;
   int hour = TimeHour(TimeCurrent());
   if(SessionStartHour <= SessionEndHour)
      return hour >= SessionStartHour && hour < SessionEndHour;
   else
      return hour >= SessionStartHour || hour < SessionEndHour; // wrap around midnight
}
