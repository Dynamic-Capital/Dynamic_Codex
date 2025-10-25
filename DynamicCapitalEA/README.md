# Dynamic Capital EA

Modular Expert Advisor built from the former `LorentzianClassificationEA` example. The EA is split into several includes for easier contribution and maintenance.

## Structure

- `DynamicCapitalEA.mq5` – slim entry point that wires modules together.
- `config.mqh` – input parameters, shared variables, and data structures.
- `session_filter.mqh` – determines if trading is allowed for the current session (placeholder implementation).
- `stats_reporter.mqh` – sends trade actions to external services such as Supabase.
- `risk_management.mqh` – handles position management and order execution.
- `strategy_logic.mqh` – core strategy logic that generates trade signals.

## Build

1. Place this `DynamicCapitalEA` folder inside your MetaTrader 5 `MQL5/Experts/` directory.
2. Compile `DynamicCapitalEA.mq5` using MetaEditor or the CLI:
   ```
   metaeditor64.exe /compile:DynamicCapitalEA.mq5 /log
   ```
3. Attach the compiled `DynamicCapitalEA.ex5` to a chart in MetaTrader 5.

Contributors can extend existing modules or add new ones following the same pattern.
