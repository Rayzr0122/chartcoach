"""
Database Seeding Script for ChartCoach Courses
Seeds MongoDB collection 'courses' from the references curriculum documents.
"""

import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import db

COURSES_DATA = [
    {
        "id": "trading-101",
        "title": "Trading 101 — Beginner Foundation",
        "tagline": "Develop a basic understanding of trading, financial markets, and how price moves.",
        "description": "The essential foundation for anyone entering financial markets. Simple concepts, visual examples, and guided steps without technical jargon. First understand the market. Then learn to analyze it.",
        "level": "Beginner",
        "levelNumber": 1,
        "levelName": "Level 1: Market Foundations",
        "lessonCount": 14,
        "durationHours": 4.5,
        "durationLabel": "4h 30m",
        "instructorName": "Rajesh Varma",
        "instructorRole": "Lead Foundations Instructor",
        "prerequisites": "None — Absolute Beginner",
        "modules": [
            {
                "id": "t101-m1",
                "title": "Module 1: What is Trading?",
                "description": "What trading is, why people trade, and the basic difference between trading and investing.",
                "lessons": [
                    {
                        "id": "t101-l1",
                        "courseId": "trading-101",
                        "title": "What is Trading & Why People Trade",
                        "order": 1,
                        "durationMinutes": 18,
                        "summary": "Understand the core concept of trading as buying and selling assets over shorter time horizons.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Trading vs. Investing", "level": 2},
                            {"type": "paragraph", "content": "Trading is the act of buying and selling financial assets—such as stocks, currencies, or commodities—with the goal of making a profit from price changes over relatively short periods. While an investor might hold an asset for years to participate in company growth, a trader focuses on price movement over minutes, hours, days, or weeks."},
                            {"type": "callout", "variant": "rule", "title": "Trading 101 Philosophy", "content": "First understand the market. Then learn to analyze it. Never risk capital without knowing who is on the other side of your trade."},
                        ],
                        "knowledgeCheck": {
                            "id": "t101-kc-1",
                            "question": "What is the primary difference between trading and investing?",
                            "options": [
                                "Trading focuses on profiting from short-to-medium term price movements, while investing focuses on long-term value accumulation",
                                "Trading is completely risk-free, while investing is dangerous",
                                "Trading only happens on weekends",
                                "Investing requires a physical trading floor",
                            ],
                            "correctIndex": 0,
                            "explanation": "Trading seeks to capitalize on price fluctuations over shorter horizons, whereas investing focuses on long-term compound growth."
                        },
                        "keyTakeaways": [
                            "Trading is actively exchanging assets to profit from price fluctuations.",
                            "Time horizons distinguish trading (short-to-medium term) from long-term investing.",
                        ]
                    }
                ]
            },
            {
                "id": "t101-m2",
                "title": "Module 2: Understanding Financial Markets",
                "description": "What a market is, its purpose, and how buyers and sellers interact.",
                "lessons": [
                    {
                        "id": "t101-l2",
                        "courseId": "trading-101",
                        "title": "How Buyers and Sellers Meet in Markets",
                        "order": 2,
                        "durationMinutes": 20,
                        "summary": "Discover why financial markets exist and how the continuous auction mechanism works.",
                        "contentBlocks": [
                            {"type": "heading", "content": "The Market as a Central Meeting Point", "level": 2},
                            {"type": "paragraph", "content": "A stock market or financial exchange provides a centralized, transparent platform where buyers and sellers can trade with confidence. When buyers are more eager than sellers, price rises. When sellers are more eager, price falls."},
                        ],
                        "keyTakeaways": ["Exchanges match buyers and sellers with standard rules and clearing.", "Eagerness and order volume dictate short-term price direction."]
                    }
                ]
            },
            {
                "id": "t101-m3",
                "title": "Module 3: Types of Financial Assets",
                "description": "Introduction to stocks, currencies (Forex), commodities, and cryptocurrencies.",
                "lessons": [
                    {
                        "id": "t101-l3",
                        "courseId": "trading-101",
                        "title": "Stocks, Forex, Commodities, and Crypto",
                        "order": 3,
                        "durationMinutes": 20,
                        "summary": "Compare the core asset classes and how each behaves.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Overview of Asset Classes", "level": 2},
                            {"type": "paragraph", "content": "Equities represent ownership in companies. Currencies trade in pairs based on macroeconomic health. Commodities include physical raw goods like Gold and Crude Oil."},
                        ],
                        "keyTakeaways": ["Different assets have different trading hours, volatility, and leverage characteristics."]
                    }
                ]
            },
            {
                "id": "t101-m4",
                "title": "Module 4: How Does a Trade Work?",
                "description": "The roles of buyer, seller, broker, and exchange; order execution mechanics.",
                "lessons": [
                    {
                        "id": "t101-l4",
                        "courseId": "trading-101",
                        "title": "Brokers, Exchanges, and Order Flow",
                        "order": 4,
                        "durationMinutes": 22,
                        "summary": "See what happens behind the scenes from the moment you click Buy or Sell.",
                        "contentBlocks": [
                            {"type": "heading", "content": "The Journey of an Order", "level": 2},
                            {"type": "paragraph", "content": "Your broker receives your order, routes it to the exchange, where matching engine algorithms match your bid with an opposing offer."},
                        ],
                        "keyTakeaways": ["Brokers are conduits; exchanges are matching engines."]
                    }
                ]
            },
            {
                "id": "t101-m5",
                "title": "Module 5: Basic Trading Terms",
                "description": "Fundamental terminology: Buy, Sell, Long, Short, Bid, Ask, Spread, Order Types.",
                "lessons": [
                    {
                        "id": "t101-l5",
                        "courseId": "trading-101",
                        "title": "Essential Vocabulary Every Trader Must Know",
                        "order": 5,
                        "durationMinutes": 25,
                        "summary": "Master terms like Bid, Ask, Spread, Limit Orders, and Market Orders.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Bid vs Ask & Order Types", "level": 2},
                            {"type": "paragraph", "content": "The Bid is the highest price a buyer is willing to pay. The Ask is the lowest price a seller will accept. The difference is the Spread."},
                        ],
                        "keyTakeaways": ["Market orders prioritize immediate execution; limit orders prioritize price control."]
                    }
                ]
            },
            {
                "id": "t101-m6",
                "title": "Module 6: Introduction to Charts",
                "description": "What a chart is, why price is shown visually, and basic chart reading.",
                "lessons": [
                    {
                        "id": "t101-l6",
                        "courseId": "trading-101",
                        "title": "Visualizing Price Over Time",
                        "order": 6,
                        "durationMinutes": 20,
                        "summary": "Understand why graphical price charts replaced ticker tape numbers.",
                        "contentBlocks": [
                            {"type": "heading", "content": "The Chart as a Mirror of Crowd Psychology", "level": 2},
                            {"type": "paragraph", "content": "A price chart gives you a clear historical record of where transactions occurred, allowing you to observe patterns and trends."},
                        ],
                        "keyTakeaways": ["Charts convert dry data tables into visual patterns and trends."]
                    }
                ]
            },
            {
                "id": "t101-m7",
                "title": "Module 7: Reading a Simple Price Chart",
                "description": "Identifying the X-axis (time), Y-axis (price), scales, and navigating chart views.",
                "lessons": [
                    {
                        "id": "t101-l7",
                        "courseId": "trading-101",
                        "title": "Navigating the X and Y Axes",
                        "order": 7,
                        "durationMinutes": 18,
                        "summary": "Learn how price scales and time intervals display historical action.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Coordinates of the Market", "level": 2},
                            {"type": "paragraph", "content": "Horizontal is time progressing forward. Vertical is price moving up or down. Every candle represents a specific slice of time."},
                        ],
                        "keyTakeaways": ["Read charts left-to-right to follow chronological price developments."]
                    }
                ]
            },
            {
                "id": "t101-m8",
                "title": "Module 8: Introduction to Candlesticks",
                "description": "What a candlestick is and what a single candle represents at a basic level.",
                "lessons": [
                    {
                        "id": "t101-l8",
                        "courseId": "trading-101",
                        "title": "The Four Crucial Prices: OHLC",
                        "order": 8,
                        "durationMinutes": 22,
                        "summary": "Understand Open, High, Low, and Close prices inside each single candle.",
                        "contentBlocks": [
                            {"type": "heading", "content": "The 4 Data Points in Every Candle", "level": 2},
                            {"type": "paragraph", "content": "A green candle closed higher than it opened. A red candle closed lower than it opened. Wicks mark the highest and lowest prices reached."},
                        ],
                        "keyTakeaways": ["Body represents net gain or loss; wicks represent extreme prices explored."]
                    }
                ]
            },
            {
                "id": "t101-m9",
                "title": "Module 9: Understanding Price Movement",
                "description": "The basic concept of price moving up or down and the influence of buyers/sellers.",
                "lessons": [
                    {
                        "id": "t101-l9",
                        "courseId": "trading-101",
                        "title": "Supply and Demand Dynamics",
                        "order": 9,
                        "durationMinutes": 20,
                        "summary": "Discover how order imbalances push prices higher or lower.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Imbalance Moves Price", "level": 2},
                            {"type": "paragraph", "content": "When there are more buyers than sellers at the current price, buyers must bid higher to attract willing sellers."},
                        ],
                        "keyTakeaways": ["Equal pressure produces sideways consolidation; unequal pressure produces trends."]
                    }
                ]
            },
            {
                "id": "t101-m10",
                "title": "Module 10: Time in Trading",
                "description": "A basic idea of different time periods: intraday, short-term, swing, and positional.",
                "lessons": [
                    {
                        "id": "t101-l10",
                        "courseId": "trading-101",
                        "title": "Intraday vs. Swing vs. Long-Term",
                        "order": 10,
                        "durationMinutes": 18,
                        "summary": "Choose the trading timeframe that matches your temperament and schedule.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Trading Horizons", "level": 2},
                            {"type": "paragraph", "content": "Intraday trades open and close during the same session. Swing trades last several days or weeks to capture full price waves."},
                        ],
                        "keyTakeaways": ["Shorter timeframes require faster reactions; longer timeframes require patience."]
                    }
                ]
            },
            {
                "id": "t101-m11",
                "title": "Module 11: Profit & Loss Basics",
                "description": "How profit and loss is calculated in a trade with simple, real examples.",
                "lessons": [
                    {
                        "id": "t101-l11",
                        "courseId": "trading-101",
                        "title": "Calculating P&L in Long and Short Trades",
                        "order": 11,
                        "durationMinutes": 22,
                        "summary": "Learn the exact mathematical formulas for calculating profits and losses.",
                        "contentBlocks": [
                            {"type": "heading", "content": "P&L = (Exit Price - Entry Price) × Quantity", "level": 2},
                            {"type": "paragraph", "content": "For a long position, profit is made when exit is higher than entry. For a short position, profit is made when exit is lower than entry."},
                        ],
                        "keyTakeaways": ["Always account for transaction fees and brokerage when calculating net P&L."]
                    }
                ]
            },
            {
                "id": "t101-m12",
                "title": "Module 12: Introduction to Trading Risk",
                "description": "Why loss is possible in trading and why protecting capital is your #1 job.",
                "lessons": [
                    {
                        "id": "t101-l12",
                        "courseId": "trading-101",
                        "title": "Capital Defense as Your Number One Job",
                        "order": 12,
                        "durationMinutes": 24,
                        "summary": "Understand that professional trading is a game of risk management first.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Losses Are a Cost of Doing Business", "level": 2},
                            {"type": "paragraph", "content": "No strategy wins 100% of the time. The secret to long-term profitability is ensuring your losses are small and controlled."},
                        ],
                        "keyTakeaways": ["Never risk money you cannot afford to lose.", "A stop loss protects you from catastrophic drawdowns."]
                    }
                ]
            },
            {
                "id": "t101-m13",
                "title": "Module 13: Your First Simulated Trade",
                "description": "The student observes and executes a simple simulated trade risk-free.",
                "lessons": [
                    {
                        "id": "t101-l13",
                        "courseId": "trading-101",
                        "title": "Hands-On Simulated Order Execution",
                        "order": 13,
                        "durationMinutes": 25,
                        "summary": "Step through placing a market order, setting a profit target, and observing price.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Practice Before Capital", "level": 2},
                            {"type": "paragraph", "content": "Simulated trading lets you build muscle memory without risking financial capital."},
                        ],
                        "keyTakeaways": ["Execute order, observe movement, and close according to plan."]
                    }
                ]
            },
            {
                "id": "t101-m14",
                "title": "Module 14: Trading Basics Challenge",
                "description": "Applying the course concepts in an interactive beginner assessment.",
                "lessons": [
                    {
                        "id": "t101-l14",
                        "courseId": "trading-101",
                        "title": "Level 1 Final Assessment & Capstone Check",
                        "order": 14,
                        "durationMinutes": 25,
                        "summary": "Test your grasp of all 14 core foundational trading concepts.",
                        "contentBlocks": [
                            {"type": "heading", "content": "Review and Certificate Validation", "level": 2},
                            {"type": "paragraph", "content": "Confirm you understand what trading is, how exchanges work, what charts show, and how risk is controlled."},
                        ],
                        "keyTakeaways": ["Ready to progress to Course 2: Chart Reading 101."]
                    }
                ]
            },
        ]
    },
    {
        "id": "chart-reading-101",
        "title": "Chart Reading 101",
        "tagline": "Confidently read and understand charts through visual observation and guided interpretation.",
        "description": "Course 2 moves from basic market concepts to hands-on visual literacy. Learn to observe candles, detect price direction, recognize timeframes, and read charts step-by-step without clutter.",
        "level": "Beginner",
        "levelNumber": 2,
        "levelName": "Level 2: Chart Reading",
        "lessonCount": 14,
        "durationHours": 5.0,
        "durationLabel": "5h 00m",
        "instructorName": "Aman Singhania",
        "instructorRole": "Price Action Chart Specialist",
        "prerequisites": "Trading 101",
        "modules": [
            {
                "id": "cr101-m1",
                "title": "Module 1: What is a Trading Chart?",
                "description": "The purpose of a chart, what information it provides, and why traders rely on it.",
                "lessons": [{"id": "cr-l1", "courseId": "chart-reading-101", "title": "The Purpose of a Chart", "order": 1, "durationMinutes": 20, "summary": "See how charts capture supply and demand consensus over time.", "contentBlocks": [{"type": "paragraph", "content": "A trading chart is a visual timeline of transactions, plotting price on the Y-axis against time on the X-axis."}], "keyTakeaways": ["Visual patterns provide faster insight than raw transaction logs."]}]
            },
            {
                "id": "cr101-m2",
                "title": "Module 2: Understanding Price & Time",
                "description": "Identifying price and time on a chart and understanding their relationship.",
                "lessons": [{"id": "cr-l2", "courseId": "chart-reading-101", "title": "The Interplay Between Price & Time", "order": 2, "durationMinutes": 20, "summary": "Learn how price changes relative to elapsed time intervals.", "contentBlocks": [{"type": "paragraph", "content": "Fast price movement over short time reveals urgency and momentum; slow movement reveals consolidation."}], "keyTakeaways": ["Slope and speed reflect urgency."]}]
            },
            {
                "id": "cr101-m3",
                "title": "Module 3: Types of Charts",
                "description": "Introduction to line charts, bar charts, and Japanese candlestick charts.",
                "lessons": [{"id": "cr-l3", "courseId": "chart-reading-101", "title": "Line, Bar, and Candlestick Charts Compared", "order": 3, "durationMinutes": 22, "summary": "Understand why Japanese candlesticks are the global standard for traders.", "contentBlocks": [{"type": "paragraph", "content": "Line charts only show closing prices. Candlesticks show Open, High, Low, and Close simultaneously, revealing intraday battle details."}], "keyTakeaways": ["Candlesticks offer rich behavioral data in a single glance."]}]
            },
            {
                "id": "cr101-m4",
                "title": "Module 4: Understanding a Candlestick",
                "description": "Understanding Open, High, Low, and Close through simple visual examples.",
                "lessons": [{"id": "cr-l4", "courseId": "chart-reading-101", "title": "Deep Dive into Single Candle Geometry", "order": 4, "durationMinutes": 24, "summary": "Inspect candle bodies, wicks, and extremes.", "contentBlocks": [{"type": "paragraph", "content": "Every candlestick tells a complete micro-story of who controlled price from open to close."}], "keyTakeaways": ["Candle body shows net progress; wicks show price rejection."]}]
            },
            {
                "id": "cr101-m5",
                "title": "Module 5: Bullish & Bearish Candles",
                "description": "Identifying candles that represent a price increase versus a price decrease.",
                "lessons": [{"id": "cr-l5", "courseId": "chart-reading-101", "title": "Bullish Expansion vs. Bearish Rejection", "order": 5, "durationMinutes": 20, "summary": "Recognize expanding green bars and descending red bars.", "contentBlocks": [{"type": "paragraph", "content": "A strong bullish candle closes near its high with a wide body. A strong bearish candle closes near its low."}], "keyTakeaways": ["The close relative to the range indicates who won the period."]}]
            },
            {
                "id": "cr101-m6",
                "title": "Module 6: Candle Body & Wicks",
                "description": "The basic meaning of a candle's body and its wick/shadow.",
                "lessons": [{"id": "cr-l6", "courseId": "chart-reading-101", "title": "Decoding Wicks as Rejection Clues", "order": 6, "durationMinutes": 22, "summary": "Understand how wicks prove that price was deemed too expensive or too cheap.", "contentBlocks": [{"type": "paragraph", "content": "Long upper wicks indicate sellers absorbed buyers. Long lower wicks indicate buyers absorbed sellers."}], "keyTakeaways": ["Wicks represent failed excursions."]}]
            },
            {
                "id": "cr101-m7",
                "title": "Module 7: Reading Multiple Candles",
                "description": "Moving from a single candle to multiple candles to observe price behaviour.",
                "lessons": [{"id": "cr-l7", "courseId": "chart-reading-101", "title": "Connecting the Dots: Multi-Candle Sequences", "order": 7, "durationMinutes": 25, "summary": "See how individual candles form runs, pauses, and clusters.", "contentBlocks": [{"type": "paragraph", "content": "Isolated candles can be misleading. Always evaluate a candle in relation to the candles immediately preceding it."}], "keyTakeaways": ["Context is king: compare the current candle to recent range."]}]
            },
            {
                "id": "cr101-m8",
                "title": "Module 8: Understanding Timeframes",
                "description": "The concept of timeframes such as 1-minute, 5-minute, hourly, and daily.",
                "lessons": [{"id": "cr-l8", "courseId": "chart-reading-101", "title": "From 1-Minute Scalping to Daily Swing Views", "order": 8, "durationMinutes": 22, "summary": "Learn how time compression groups transactions into candles.", "contentBlocks": [{"type": "paragraph", "content": "A daily candle contains seventy-five 5-minute candles. Higher timeframes carry more institutional weight."}], "keyTakeaways": ["Higher timeframes filter out noise; lower timeframes pinpoint entries."]}]
            },
            {
                "id": "cr101-m9",
                "title": "Module 9: Zooming Into a Chart",
                "description": "Viewing the same price movement across different timeframes.",
                "lessons": [{"id": "cr-l9", "courseId": "chart-reading-101", "title": "Multi-Timeframe Fractal Perspective", "order": 9, "durationMinutes": 24, "summary": "Observe how a single daily candle expands into a complete intraday trend.", "contentBlocks": [{"type": "paragraph", "content": "Zooming in lets you see the internal mechanics of a hammer or engulfing bar."}], "keyTakeaways": ["Market structure is fractal: patterns repeat on all timeframes."]}]
            },
            {
                "id": "cr101-m10",
                "title": "Module 10: Price Going Up & Down",
                "description": "Visually identifying upward and downward movement on charts.",
                "lessons": [{"id": "cr-l10", "courseId": "chart-reading-101", "title": "Recognizing Upward Waves & Downward Drops", "order": 10, "durationMinutes": 20, "summary": "Train your eye to spot rising staircases and descending waterfalls.", "contentBlocks": [{"type": "paragraph", "content": "Market moves unfold in swings or waves, alternating between expansion and retracement."}], "keyTakeaways": ["Price never moves in a straight line forever."]}]
            },
            {
                "id": "cr101-m11",
                "title": "Module 11: Simple Market Movements",
                "description": "Basic observation: price movement, pauses (consolidation), and reversals.",
                "lessons": [{"id": "cr-l11", "courseId": "chart-reading-101", "title": "The Three States: Move, Pause, Reverse", "order": 11, "durationMinutes": 22, "summary": "Understand the rhythm of market cycles.", "contentBlocks": [{"type": "paragraph", "content": "Markets spend roughly 70% of time pausing/consolidating and 30% in aggressive expansion."}], "keyTakeaways": ["Wait for pauses to end before entering trending trades."]}]
            },
            {
                "id": "cr101-m12",
                "title": "Module 12: Reading a Chart Step-by-Step",
                "description": "A structured, repeatable process for systematically reading any simple chart.",
                "lessons": [{"id": "cr-l12", "courseId": "chart-reading-101", "title": "The 4-Step Chart Reading Checklist", "order": 12, "durationMinutes": 25, "summary": "Follow a standardized routine whenever opening a new chart.", "contentBlocks": [{"type": "paragraph", "content": "Step 1: Identify overall direction. Step 2: Note recent highs and lows. Step 3: Check candle momentum. Step 4: Locate key turning points."}], "keyTakeaways": ["Consistency in chart routine produces consistent trading decisions."]}]
            },
            {
                "id": "cr101-m13",
                "title": "Module 13: Chart Reading Practice Lab",
                "description": "Making basic observations across multiple real historical charts.",
                "lessons": [{"id": "cr-l13", "courseId": "chart-reading-101", "title": "Guided Chart Inspection Drills", "order": 13, "durationMinutes": 28, "summary": "Practice reading clean charts without indicator distractions.", "contentBlocks": [{"type": "paragraph", "content": "Apply the 4-step reading checklist across indices, stocks, and commodities."}], "keyTakeaways": ["Visual literacy requires active observation on diverse charts."]}]
            },
            {
                "id": "cr101-m14",
                "title": "Module 14: Chart Reading Challenge",
                "description": "An interactive assessment where students answer questions by reading charts.",
                "lessons": [{"id": "cr-l14", "courseId": "chart-reading-101", "title": "Final Chart Reading Evaluation", "order": 14, "durationMinutes": 25, "summary": "Test your ability to describe what price is doing on unseen historical charts.", "contentBlocks": [{"type": "paragraph", "content": "Identify direction, candle signals, and pause zones under quiz conditions."}], "keyTakeaways": ["Graduation certifies readiness for Course 3: Reading the Market."]}]
            },
        ]
    },
    {
        "id": "reading-the-market",
        "title": "Reading the Market",
        "tagline": "Move from simply seeing a chart to understanding what price behavior is telling you.",
        "description": "Course 3 teaches learners how to move from passive chart viewing to active market interpretation. Learn to compare periods, recognize rising and falling sequences, and understand sideways value zones.",
        "level": "Beginner",
        "levelNumber": 3,
        "levelName": "Level 3: Reading the Market",
        "lessonCount": 12,
        "durationHours": 4.0,
        "durationLabel": "4h 00m",
        "instructorName": "Vikram Malhotra",
        "instructorRole": "Market Structure Educator",
        "prerequisites": "Trading 101 → Chart Reading 101",
        "modules": [
            {"id": "rtm-m1", "title": "Module 1: Revisiting the Chart", "description": "The basic structure of a chart; identifying price and time.", "lessons": [{"id": "rtm-l1", "courseId": "reading-the-market", "title": "Revisiting Market Geometry", "order": 1, "durationMinutes": 20, "summary": "Firmly anchor how price discovery unfolds across time.", "contentBlocks": [{"type": "paragraph", "content": "Price is the consensus of value; time is the measure of acceptance."}], "keyTakeaways": ["Charts record where transactions were accepted versus rejected."]}]},
            {"id": "rtm-m2", "title": "Module 2: Understanding Candles", "description": "Understanding the body of a candle and its basic movement.", "lessons": [{"id": "rtm-l2", "courseId": "reading-the-market", "title": "The Meaning Behind Candle Real Bodies", "order": 2, "durationMinutes": 20, "summary": "Distinguish between conviction candles and indecision candles.", "contentBlocks": [{"type": "paragraph", "content": "Wide bodies indicate high volume agreement; narrow dojis indicate equilibrium."}], "keyTakeaways": ["Wide candles mean momentum; small candles mean pause."]}]},
            {"id": "rtm-m3", "title": "Module 3: One Candle vs Many Candles", "description": "The difference between looking at a single candle and looking at multiple candles together.", "lessons": [{"id": "rtm-l3", "courseId": "reading-the-market", "title": "Single Candle Signals in Context", "order": 3, "durationMinutes": 22, "summary": "Never judge a candle in isolation.", "contentBlocks": [{"type": "paragraph", "content": "A pin bar in the middle of a choppy range has zero edge, but at a major low it carries immense probability."}], "keyTakeaways": ["Location determines the validity of candle patterns."]}]},
            {"id": "rtm-m4", "title": "Module 4: How Price Moves", "description": "Observing upward, downward, and sideways price movement.", "lessons": [{"id": "rtm-l4", "courseId": "reading-the-market", "title": "Up, Down, and Sideways Regimes", "order": 4, "durationMinutes": 22, "summary": "Differentiate between trending regimes and range-bound regimes.", "contentBlocks": [{"type": "paragraph", "content": "Trending markets require breakout and pullback tactics; range markets require fading extremes."}], "keyTakeaways": ["Identify the regime before choosing your trade tactic."]}]},
            {"id": "rtm-m5", "title": "Module 5: Reading Direction", "description": "Identifying, at a basic level, which direction price is generally moving on a chart.", "lessons": [{"id": "rtm-l5", "courseId": "reading-the-market", "title": "Determining General Direction Without Jargon", "order": 5, "durationMinutes": 20, "summary": "Answer: Is the market generally climbing, dropping, or stuck?", "contentBlocks": [{"type": "paragraph", "content": "Look at the swing highs and swing lows to immediately establish market direction."}], "keyTakeaways": ["Follow the path of least resistance."]}]},
            {"id": "rtm-m6", "title": "Module 6: Rising & Falling Markets", "description": "Recognizing simple rising and falling price sequences.", "lessons": [{"id": "rtm-l6", "courseId": "reading-the-market", "title": "Sequences of Expansion and Pullback", "order": 6, "durationMinutes": 22, "summary": "Track impulsive waves followed by corrective pauses.", "contentBlocks": [{"type": "paragraph", "content": "Rising markets make aggressive up-legs followed by shallow pullbacks."}], "keyTakeaways": ["Impulse = strength; correction = weakness."]}]},
            {"id": "rtm-m7", "title": "Module 7: Sideways Markets", "description": "Understanding the situation when price is clearly not moving up or down.", "lessons": [{"id": "rtm-l7", "courseId": "reading-the-market", "title": "The Dynamics of Consolidation", "order": 7, "durationMinutes": 20, "summary": "Learn why price consolidates between support and resistance boundaries.", "contentBlocks": [{"type": "paragraph", "content": "In sideways markets, buyers and sellers are balanced. Energy is being stored for the next expansion."}], "keyTakeaways": ["Avoid over-trading inside narrow consolidation zones."]}]},
            {"id": "rtm-m8", "title": "Module 8: Important Price Areas", "description": "Noticing areas on a chart where price has repeatedly reacted.", "lessons": [{"id": "rtm-l8", "courseId": "reading-the-market", "title": "Locating Repetitive Decision Areas", "order": 8, "durationMinutes": 24, "summary": "Highlight historical turning points on naked charts.", "contentBlocks": [{"type": "paragraph", "content": "Price has memory. Areas that prompted sharp reversals in the past will attract orders in the future."}], "keyTakeaways": ["Mark zones where strong volume originated."]}]},
            {"id": "rtm-m9", "title": "Module 9: Comparing Time Periods", "description": "The basic concept of viewing the same asset across different time periods.", "lessons": [{"id": "rtm-l9", "courseId": "reading-the-market", "title": "Top-Down Multi-Timeframe Observation", "order": 9, "durationMinutes": 22, "summary": "Look at daily, hourly, and 15-minute perspectives together.", "contentBlocks": [{"type": "paragraph", "content": "Always align with the higher timeframe direction before trading intraday setups."}], "keyTakeaways": ["Higher timeframes govern lower timeframe outcomes."]}]},
            {"id": "rtm-m10", "title": "Module 10: Reading a Chart as a Story", "description": "Viewing multiple candles/movements in sequence to describe price behaviour.", "lessons": [{"id": "rtm-l10", "courseId": "reading-the-market", "title": "Synthesizing the Narrative of Price Action", "order": 10, "durationMinutes": 25, "summary": "Narrate what buyers attempted, how sellers reacted, and who won.", "contentBlocks": [{"type": "paragraph", "content": "Price action is a continuous conversation. Each candle is a sentence; each swing is a paragraph."}], "keyTakeaways": ["Read the complete story from left to right."]}]},
            {"id": "rtm-m11", "title": "Module 11: Basic Chart Analysis Practice", "description": "Solving observation-based questions on given historical charts.", "lessons": [{"id": "rtm-l11", "courseId": "reading-the-market", "title": "Hands-On Market Reading Lab", "order": 11, "durationMinutes": 25, "summary": "Apply sequence analysis and zone recognition to live examples.", "contentBlocks": [{"type": "paragraph", "content": "Test your diagnostic skills across multiple real market charts."}], "keyTakeaways": ["Practice builds intuition and pattern recognition speed."]}]},
            {"id": "rtm-m12", "title": "Module 12: Market Reading Challenge", "description": "Testing basic interpretation by showing the student unseen charts.", "lessons": [{"id": "rtm-l12", "courseId": "reading-the-market", "title": "Final Market Interpretation Examination", "order": 12, "durationMinutes": 25, "summary": "Demonstrate that you can read direction, zones, and sequences independently.", "contentBlocks": [{"type": "paragraph", "content": "Answer scenario questions on unseen charts to graduate to Course 4."}], "keyTakeaways": ["Certified in market reading. Ready for The Language of Price."]}]},
        ]
    },
    {
        "id": "language-of-price",
        "title": "The Language of Price",
        "tagline": "Deeply understand price behavior, reactions, breakouts, pullbacks, and failed moves.",
        "description": "Course 4 is the foundation of genuine price action thinking. Move from 'What is happening?' to 'What does price's behavior indicate?' Interpret momentum, rejections, false breakouts, and multi-candle footprints in context.",
        "level": "Intermediate",
        "levelNumber": 4,
        "levelName": "Level 4: Price Action",
        "lessonCount": 14,
        "durationHours": 6.0,
        "durationLabel": "6h 00m",
        "instructorName": "Dr. Ananya Sharma",
        "instructorRole": "Behavioral Price Action Head",
        "prerequisites": "Trading 101 → Chart Reading 101 → Reading the Market",
        "modules": [
            {"id": "lop-m1", "title": "Module 1: Understanding Price Behaviour", "description": "Price does not move randomly; how buying and selling activity influences price.", "lessons": [{"id": "lop-l1", "courseId": "language-of-price", "title": "Non-Random Nature of Price Discovery", "order": 1, "durationMinutes": 25, "summary": "Understand that price moves to seek liquidity and balance supply and demand.", "contentBlocks": [{"type": "paragraph", "content": "Price is moved by institutional intent, liquidity requirements, and structural stops."}], "keyTakeaways": ["Price moves with purpose toward liquidity pools."]}]},
            {"id": "lop-m2", "title": "Module 2: Impulse & Correction", "description": "Understanding strong price moves and the corrective movements between them.", "lessons": [{"id": "lop-l2", "courseId": "language-of-price", "title": "Impulsive Expansion vs. Corrective Absorption", "order": 2, "durationMinutes": 28, "summary": "Recognize the difference between trend engine moves and pauses.", "contentBlocks": [{"type": "paragraph", "content": "Impulsive moves have large consecutive bodies. Corrective moves overlap with choppy wicks."}], "keyTakeaways": ["Trade in the direction of impulsive moves; enter during corrective pauses."]}]},
            {"id": "lop-m3", "title": "Module 3: Reading Price Reactions", "description": "Observing how price reacts at important decision levels.", "lessons": [{"id": "lop-l3", "courseId": "language-of-price", "title": "The Anatomy of a Key Level Reaction", "order": 3, "durationMinutes": 26, "summary": "See whether price slices through a level or bounces with vigor.", "contentBlocks": [{"type": "paragraph", "content": "When price approaches support, watch the speed and volume of the reaction."}], "keyTakeaways": ["Reactions reveal whether institutional orders are present."]}]},
            {"id": "lop-m4", "title": "Module 4: Rejections", "description": "Identifying on a chart when price rejects a level.", "lessons": [{"id": "lop-l4", "courseId": "language-of-price", "title": "Pin Bars, Wick Sweeps, and Sharp Reversals", "order": 4, "durationMinutes": 26, "summary": "Spot clear rejection signatures where price cannot sustain a move.", "contentBlocks": [{"type": "paragraph", "content": "A rejection proves that opposing market participants entered with overwhelming size."}], "keyTakeaways": ["Rejection wicks confirm support or resistance."]}]},
            {"id": "lop-m5", "title": "Module 5: Breakouts & Failed Breakouts", "description": "Understanding genuine breakouts versus bull/bear trap fakeouts.", "lessons": [{"id": "lop-l5", "courseId": "language-of-price", "title": "Distinguishing Genuine Breakouts from Retail Traps", "order": 5, "durationMinutes": 28, "summary": "Learn why most retail breakouts fail and how to trade the retest.", "contentBlocks": [{"type": "paragraph", "content": "A genuine breakout closes decisively beyond the level with high volume and follow-through."}], "keyTakeaways": ["Wait for the retest confirmation before committing capital."]}]},
            {"id": "lop-m6", "title": "Module 6: Pullbacks", "description": "Interpreting price pulling back after a strong move.", "lessons": [{"id": "lop-l6", "courseId": "language-of-price", "title": "Healthy Retracements vs. Deep Trend Fatigue", "order": 6, "durationMinutes": 25, "summary": "Measure pullback depth and velocity to confirm trend health.", "contentBlocks": [{"type": "paragraph", "content": "Shallow pullbacks (38.2% - 50%) signify strong momentum and high continuation odds."}], "keyTakeaways": ["Healthy pullbacks have shrinking volume and small candles."]}]},
            {"id": "lop-m7", "title": "Module 7: Momentum", "description": "Fast vs. slow price movement and a visual understanding of momentum.", "lessons": [{"id": "lop-l7", "courseId": "language-of-price", "title": "Visualizing Acceleration and Deceleration", "order": 7, "durationMinutes": 25, "summary": "Measure the angle and size of consecutive candles.", "contentBlocks": [{"type": "paragraph", "content": "When candle bodies shrink as price makes new highs, momentum is waning."}], "keyTakeaways": ["Deceleration precedes reversals."]}]},
            {"id": "lop-m8", "title": "Module 8: Candlestick Behaviour", "description": "Understanding the behavior and context of candles rather than isolated patterns.", "lessons": [{"id": "lop-l8", "courseId": "language-of-price", "title": "Behavior Over Names: Reading Candle Pressure", "order": 8, "durationMinutes": 26, "summary": "Forget memorizing 50 exotic names; understand buying and selling pressure.", "contentBlocks": [{"type": "paragraph", "content": "A candle is simply a summary of where buyers pushed and where sellers fought back."}], "keyTakeaways": ["Focus on the battle narrative, not candle nomenclature."]}]},
            {"id": "lop-m9", "title": "Module 9: Price & Volume Together", "description": "Observing price movement together with volume to gauge strength.", "lessons": [{"id": "lop-l9", "courseId": "language-of-price", "title": "Volume Confirmation and Divergence", "order": 9, "durationMinutes": 28, "summary": "Confirm whether big money is backing the move or fading away.", "contentBlocks": [{"type": "paragraph", "content": "Rising prices on falling volume warn of impending exhaustion."}], "keyTakeaways": ["Volume validates price conviction."]}]},
            {"id": "lop-m10", "title": "Module 10: Market Context", "description": "Why the same price pattern can mean different things in different market conditions.", "lessons": [{"id": "lop-l10", "courseId": "language-of-price", "title": "Context Dictates Outcome", "order": 10, "durationMinutes": 25, "summary": "Understand that an engulfing bar in a range is vastly different from one at a trend high.", "contentBlocks": [{"type": "paragraph", "content": "Always define market context (trend, range, volatility) before evaluating a signal."}], "keyTakeaways": ["Never trade patterns without market context."]}]},
            {"id": "lop-m11", "title": "Module 11: Multiple Clues, One Story", "description": "Interpreting different price signals collectively rather than individually.", "lessons": [{"id": "lop-l11", "courseId": "language-of-price", "title": "Confluence: Bringing the Clues Together", "order": 11, "durationMinutes": 26, "summary": "Combine trend direction, support zone, rejection wick, and volume.", "contentBlocks": [{"type": "paragraph", "content": "When 3 or 4 independent clues point to the same outcome, probability skyrockets."}], "keyTakeaways": ["Confluence separates novice gamblers from professional analysts."]}]},
            {"id": "lop-m12", "title": "Module 12: Reading a Price Story", "description": "A structured, left-to-right interpretation of what price did and why it did it.", "lessons": [{"id": "lop-l12", "courseId": "language-of-price", "title": "Narrating Full Chart Developments", "order": 12, "durationMinutes": 30, "summary": "Synthesize full historical charts into clear, coherent narratives.", "contentBlocks": [{"type": "paragraph", "content": "Practice narrating each stage: accumulation, breakout, pullback, continuation."}], "keyTakeaways": ["The market always leaves clues for those who know how to listen."]}]},
            {"id": "lop-m13", "title": "Module 13: Price Action Practice Lab", "description": "Identifying reactions, breakouts, pullbacks, and momentum on historical charts.", "lessons": [{"id": "lop-l13", "courseId": "language-of-price", "title": "Interactive Historical Replay Lab", "order": 13, "durationMinutes": 30, "summary": "Step bar-by-bar through historical price action scenarios.", "contentBlocks": [{"type": "paragraph", "content": "Freeze the chart, make your deduction, and reveal the next candles."}], "keyTakeaways": ["Bar-by-bar practice sharpens real-time decision making."]}]},
            {"id": "lop-m14", "title": "Module 14: Price Behaviour Challenge", "description": "Testing the student's observation and reasoning on unseen charts.", "lessons": [{"id": "lop-l14", "courseId": "language-of-price", "title": "Price Action Mastery Certification", "order": 14, "durationMinutes": 28, "summary": "Demonstrate complete fluency in the Language of Price.", "contentBlocks": [{"type": "paragraph", "content": "Evaluate complex market scenarios and formulate reasoned hypotheses."}], "keyTakeaways": ["Certified in Price Action. Ready to build a structured trading strategy."]}]},
        ]
    },
    {
        "id": "building-trading-strategy",
        "title": "Building a Trading Strategy",
        "tagline": "Convert chart analysis into a structured, repeatable, rule-based trading approach.",
        "description": "Course 5 teaches students to shift from prediction-based thinking ('I think price might go up') to rule-based thinking ('According to my strategy, condition X is met, entry at Y, invalidation at Z, and risk is defined'). Build, test, and apply a complete strategy.",
        "level": "Intermediate",
        "levelNumber": 5,
        "levelName": "Level 5: Strategy & Risk",
        "lessonCount": 14,
        "durationHours": 5.5,
        "durationLabel": "5h 30m",
        "instructorName": "Capt. Arvind Nair",
        "instructorRole": "Quantitative Strategy & Risk Head",
        "prerequisites": "Trading 101 → Chart Reading 101 → Reading the Market → The Language of Price",
        "modules": [
            {"id": "bts-m1", "title": "Module 1: What Makes a Trading Strategy?", "description": "What a strategy is and how it differs from random guessing.", "lessons": [{"id": "bts-l1", "courseId": "building-trading-strategy", "title": "The Architecture of a Rule-Based Strategy", "order": 1, "durationMinutes": 25, "summary": "Learn why random trading leads to ruin and how rules create an edge.", "contentBlocks": [{"type": "paragraph", "content": "A trading strategy is a predefined set of rules that governs when to enter, when to exit, how much to risk, and when to stay out."}], "keyTakeaways": ["Rules eliminate emotional decision-making in the heat of the market."]}]},
            {"id": "bts-m2", "title": "Module 2: Finding a Trading Opportunity", "description": "A basic framework for identifying potential opportunities in the market.", "lessons": [{"id": "bts-l2", "courseId": "building-trading-strategy", "title": "Screening for High-Probability Conditions", "order": 2, "durationMinutes": 25, "summary": "Scan charts for alignment of trend, level, and momentum.", "contentBlocks": [{"type": "paragraph", "content": "Do not trade every chart. Wait for conditions that match your specific setup parameters."}], "keyTakeaways": ["Patience is the primary virtue of the systematic trader."]}]},
            {"id": "bts-m3", "title": "Module 3: Entry Conditions", "description": "Which conditions should be satisfied before entering a trade.", "lessons": [{"id": "bts-l3", "courseId": "building-trading-strategy", "title": "Formulating Exact Entry Triggers", "order": 3, "durationMinutes": 26, "summary": "Define the precise price, candle close, or breakout that triggers your entry.", "contentBlocks": [{"type": "paragraph", "content": "Never enter on a hunch. State your exact entry trigger in advance."}], "keyTakeaways": ["Clear entry triggers prevent hesitation and second-guessing."]}]},
            {"id": "bts-m4", "title": "Module 4: Exit Conditions", "description": "When to close a trade and why defining the exit in advance is important.", "lessons": [{"id": "bts-l4", "courseId": "building-trading-strategy", "title": "Planning the Exit Before the Entry", "order": 4, "durationMinutes": 25, "summary": "Know where you will take profits and where you will cut losses before clicking Buy.", "contentBlocks": [{"type": "paragraph", "content": "Your exit plan must be objective, based on chart structure and risk targets."}], "keyTakeaways": ["Entering without an exit plan is pure gambling."]}]},
            {"id": "bts-m5", "title": "Module 5: Stop Loss & Protection", "description": "The purpose of a stop loss and a basic approach to protecting capital from downside.", "lessons": [{"id": "bts-l5", "courseId": "building-trading-strategy", "title": "The Structural Invalidation Stop Loss", "order": 5, "durationMinutes": 28, "summary": "Place stops where your trading idea is mathematically and structurally proven wrong.", "contentBlocks": [{"type": "paragraph", "content": "A stop loss should sit beyond the key swing point that invalidates your setup."}], "keyTakeaways": ["Never move a stop loss further away after entering."]}]},
            {"id": "bts-m6", "title": "Module 6: Risk & Reward", "description": "Comparing potential loss against potential profit.", "lessons": [{"id": "bts-l6", "courseId": "building-trading-strategy", "title": "Asymmetric Risk-to-Reward Geometry", "order": 6, "durationMinutes": 25, "summary": "Target minimum 1:2 and 1:3 R:R setups to achieve long-term edge.", "contentBlocks": [{"type": "paragraph", "content": "With a 1:2.5 R:R, you can profit even with a 40% win rate."}], "keyTakeaways": ["Always ensure potential reward outweighs potential risk by at least 2x."]}]},
            {"id": "bts-m7", "title": "Module 7: Position Size Basics", "description": "How much capital to expose in a single trade.", "lessons": [{"id": "bts-l7", "courseId": "building-trading-strategy", "title": "The 1% Capital Risk Formula", "order": 7, "durationMinutes": 26, "summary": "Calculate shares/contracts dynamically based on stop-loss distance.", "contentBlocks": [{"type": "paragraph", "content": "Position Size = (Account Capital × 1%) ÷ (Entry - Stop Loss)."}], "keyTakeaways": ["Risk a fixed percentage of capital, never a fixed number of shares."]}]},
            {"id": "bts-m8", "title": "Module 8: Trade Setup & Rules", "description": "Clearly defining entry, exit, invalidation, and market conditions.", "lessons": [{"id": "bts-l8", "courseId": "building-trading-strategy", "title": "Documenting Your Strategy Checklist", "order": 8, "durationMinutes": 25, "summary": "Write down unambiguous if-then rules for your trading playbook.", "contentBlocks": [{"type": "paragraph", "content": "If condition A + condition B + trigger C occur, then enter with 1% risk."}], "keyTakeaways": ["If it cannot be written down clearly, it is not a strategy."]}]},
            {"id": "bts-m9", "title": "Module 9: Simple Strategy Examples", "description": "Understanding basic strategy ideas such as trend-following, breakout, and pullback.", "lessons": [{"id": "bts-l9", "courseId": "building-trading-strategy", "title": "Classic Playbook Strategies Dissected", "order": 9, "durationMinutes": 28, "summary": "Examine the Trend Pullback Strategy and the Value Breakout Retest.", "contentBlocks": [{"type": "paragraph", "content": "Study historical execution examples of trend-following and key-level bounces."}], "keyTakeaways": ["Simple strategies executed with discipline beat complex models."]}]},
            {"id": "bts-m10", "title": "Module 10: When Not to Trade", "description": "Identifying poor setups, unclear conditions, and unsuitable market situations.", "lessons": [{"id": "bts-l10", "courseId": "building-trading-strategy", "title": "The Power of Sitting on Your Hands", "order": 10, "durationMinutes": 22, "summary": "Learn when market conditions are too choppy or news-heavy to trade.", "contentBlocks": [{"type": "paragraph", "content": "Cash is a valid position. Preserving mental and financial capital is an active trade."}], "keyTakeaways": ["Staying out during choppy conditions protects your streak and capital."]}]},
            {"id": "bts-m11", "title": "Module 11: Testing a Strategy", "description": "The basic process of manually testing a strategy on historical charts.", "lessons": [{"id": "bts-l11", "courseId": "building-trading-strategy", "title": "Historical Replay & Forward Simulation", "order": 11, "durationMinutes": 28, "summary": "Test your rules across 50 past trades to establish expected win rate and R:R.", "contentBlocks": [{"type": "paragraph", "content": "Manually recording 50 trades in a spreadsheet reveals if your rules truly work."}], "keyTakeaways": ["Never trade live money without testing your rules on historical data."]}]},
            {"id": "bts-m12", "title": "Module 12: Keeping a Trading Journal", "description": "Recording trades, noting observations, and identifying mistakes.", "lessons": [{"id": "bts-l12", "courseId": "building-trading-strategy", "title": "The Post-Trade Review Process", "order": 12, "durationMinutes": 25, "summary": "Log entry, exit, screenshot, emotional state, and rule adherence.", "contentBlocks": [{"type": "paragraph", "content": "Your trading journal is your personalized feedback mirror. It reveals your recurring leaks."}], "keyTakeaways": ["The journal separates hopeful amateurs from consistent professionals."]}]},
            {"id": "bts-m13", "title": "Module 13: Strategy Lab", "description": "Students execute and review simulated trades according to their own rules.", "lessons": [{"id": "bts-l13", "courseId": "building-trading-strategy", "title": "Simulated Strategy Execution Lab", "order": 13, "durationMinutes": 30, "summary": "Trade your strategy under simulated market conditions with AI rule compliance check.", "contentBlocks": [{"type": "paragraph", "content": "The AI checks if your entry complied with your defined strategy conditions."}], "keyTakeaways": ["Rule adherence is the metric of success, regardless of trade outcome."]}]},
            {"id": "bts-m14", "title": "Module 14: Build Your First Strategy", "description": "The student creates a complete beginner-level trading strategy.", "lessons": [{"id": "bts-l14", "courseId": "building-trading-strategy", "title": "Capstone: Publishing Your Personal Trading Playbook", "order": 14, "durationMinutes": 35, "summary": "Assemble Market Condition, Setup, Entry, Stop Loss, Target, and Exit rules.", "contentBlocks": [{"type": "paragraph", "content": "Complete your ChartCoach graduation and obtain your certified Strategy Playbook."}], "keyTakeaways": ["You are now a rule-based, disciplined trader equipped to navigate live markets."]}]},
        ]
    }
]


def seed_courses():
    print("Connecting to MongoDB collection 'courses'...")
    collection = db.courses
    
    # Ensure index on id
    collection.create_index("id", unique=True)
    
    # Upsert each course
    inserted_count = 0
    updated_count = 0
    
    for course in COURSES_DATA:
        course_id = course["id"]
        # Ensure instructor object format for frontend compatibility
        course["instructor"] = {
            "name": course.get("instructorName", "Rajesh Varma"),
            "role": course.get("instructorRole", "Lead Foundations Instructor"),
        }
        course["isEnrolled"] = False
        course["progressPercent"] = 0
        
        # Ensure default lesson fields
        for module in course.get("modules", []):
            for idx, lesson in enumerate(module.get("lessons", [])):
                if "completed" not in lesson:
                    lesson["completed"] = False
                if "locked" not in lesson:
                    # By default, first lesson of course is unlocked
                    lesson["locked"] = False
                if "contentBlocks" not in lesson:
                    lesson["contentBlocks"] = []
                if "keyTakeaways" not in lesson:
                    lesson["keyTakeaways"] = []

        res = collection.update_one(
            {"id": course_id},
            {"$set": course},
            upsert=True
        )
        if res.upserted_id:
            inserted_count += 1
            print(f" [+] Inserted new course: {course['title']} ({course_id})")
        else:
            updated_count += 1
            print(f" [✓] Updated course: {course['title']} ({course_id})")
            
    print(f"\nDone! Successfully seeded {len(COURSES_DATA)} courses in MongoDB.")
    print(f"Total courses now in DB: {collection.count_documents({})}")


if __name__ == "__main__":
    seed_courses()
