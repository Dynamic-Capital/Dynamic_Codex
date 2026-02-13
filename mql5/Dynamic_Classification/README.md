# Dynamic Classification EA

Modular MQL5 Expert Advisor implementing a Lorentzian-distance KNN classifier.

## Files
- `Dynamic_Classification_EA.mq5` – main EA entry
- `config.mqh` – input parameters
- `strategy_logic.mqh` – feature buffers and KNN logic
- `risk_management.mqh` – lot sizing and SL/TP handling
- `position_manager.mqh` – trade execution and reporting
- `stats_reporter.mqh` – WebRequest JSON telemetry
- `session_filter.mqh` – trading session restrictions
- `equity_protection.mqh` – basic drawdown guard
- `multi_timeframe.mqh` – placeholder for HTF signals
- `logger.mqh` and `utils.mqh` – helper utilities
