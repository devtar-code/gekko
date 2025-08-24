# Gekko - Bitcoin Trading Bot

*The most valuable commodity I know of is information.*
-Gordon Gekko

Gekko is a Bitcoin TA trading and backtesting platform that connects to popular Bitcoin exchanges. It is written in JavaScript and runs on [Node.js](http://nodejs.org).

**Version 0.8.0** - Enhanced with modern Vue.js UI and improved setup process.

*Use Gekko at your own risk.*

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **Git** for cloning the repository

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/askmike/gekko.git
   cd gekko
   ```

2. **Install main dependencies:**
   ```bash
   npm install
   ```

3. **Install exchange dependencies:**
   ```bash
   cd exchange
   npm install
   cd ..
   ```

4. **Install Vue UI dependencies:**
   ```bash
   cd web/vue
   npm install
   cd ../..
   ```

### Running Gekko

#### Option 1: Start with Web UI (Recommended)
```bash
npm start
```
This will start Gekko with the web interface at `http://localhost:3000`

#### Option 2: Start Vue UI Development Server
```bash
cd web/vue
npm run serve
```
This starts the Vue development server at `http://localhost:8080`

#### Option 3: Command Line Mode
```bash
node gekko --config config.js
```

## 🎯 Features

- **Real-time Trading**: Connect to major exchanges (Binance, Bitfinex, Kraken, etc.)
- **Backtesting**: Test strategies against historical data
- **Paper Trading**: Practice without real money
- **Modern Web UI**: Beautiful Vue.js interface for easy configuration
- **Multiple Strategies**: MACD, RSI, CCI, PPO, and custom strategies
- **Performance Analysis**: Detailed trading performance metrics

## 📁 Project Structure

```
gekko/
├── config/           # Configuration files
├── core/            # Core trading engine
├── exchange/        # Exchange integrations
├── plugins/         # Trading plugins
├── strategies/      # Trading strategies
├── web/            # Web interface
│   └── vue/        # Vue.js UI (v0.3.0)
└── gekko.js        # Main entry point
```

## 🔧 Configuration

1. Copy `sample-config.js` to `config.js`
2. Configure your exchange API keys
3. Select your trading strategy
4. Set up risk management parameters

## 📚 Documentation

- [Installation Guide](docs/installation/installing_gekko.md)
- [Strategy Development](docs/strategies/creating_a_strategy.md)
- [Exchange Setup](docs/introduction/supported_exchanges.md)
- [API Documentation](docs/internals/server_api.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is for educational purposes only. Use at your own risk. The authors are not responsible for any financial losses.

---

**Original Author:** Mike van Rossum (@askmike)  
**Current Version:** 0.8.0  
**Vue UI Version:** 0.3.0
