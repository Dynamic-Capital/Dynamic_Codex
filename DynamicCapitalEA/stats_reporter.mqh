#pragma once

void SendReport(string action)
{
   string json = StringFormat("{\"symbol\":\"%s\",\"action\":\"%s\"}", _Symbol, action);
   char post[]; StringToCharArray(json, post);
   char result[];
   string headers = "Content-Type: application/json\r\n";
   int timeout = 5000;
   int res = WebRequest("POST", SupabaseURL, headers, timeout, post, result, NULL);
   if(res == -1)
      Print("WebRequest error: ", GetLastError());
   else
      Print("Report sent: ", json);
}
