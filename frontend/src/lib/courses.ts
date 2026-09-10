export type Lesson = {
  id: string;
  title: string;
  duration: string;
  type: "video" | "interactive_chart" | "quiz";
  completed?: boolean;
};

export type CourseModule = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  tagline: string;
  category: "Price Action" | "Smart Money (SMC)" | "Options & Derivatives" | "Quantitative" | "Risk Management";
  level: "Beginner" | "Intermediate" | "Advanced" | "All Levels";
  levelNumber: 1 | 2 | 3 | 4 | 5;
  levelName: string;
  rating: number;
  reviewsCount: number;
  studentsCount: number;
  totalModules: number;
  totalLessons: number;
  duration: string;
  progress?: number;
  isEnrolled?: boolean;
  featured?: boolean;
  instructor: {
    name: string;
    role: string;
    avatarBg: string;
  };
  description: string;
  learnings: string[];
  modules: CourseModule[];
};

export const INITIAL_COURSES: Course[] = [
  {
    "id": "trading-101",
    "title": "Trading 101 \u2014 Beginner Foundation",
    "tagline": "Develop a basic understanding of trading, financial markets, and how price moves.",
    "category": "Price Action",
    "level": "Beginner",
    "levelNumber": 1,
    "levelName": "Level 1: Market Foundations",
    "rating": 4.9,
    "reviewsCount": 3200,
    "studentsCount": 18500,
    "totalModules": 14,
    "totalLessons": 14,
    "duration": "4h 30m",
    "progress": 14,
    "isEnrolled": true,
    "featured": true,
    "instructor": {
      "name": "Rajesh Varma",
      "role": "Lead Foundations Instructor",
      "avatarBg": "from-blue-600 to-indigo-600"
    },
    "description": "The essential foundation for anyone entering financial markets. Simple concepts, visual examples, and guided steps without technical jargon. First understand the market. Then learn to analyze it.",
    "learnings": [
      "Master core concepts of Trading 101 \u2014 Beginner Foundation",
      "Analyze charts with zero confusing indicator noise",
      "Apply rule-based principles under simulated market conditions",
      "Identify high-probability setups and protect capital"
    ],
    "modules": [
      {
        "id": "t101-m1",
        "title": "Module 1: What is Trading?",
        "lessons": [
          {
            "id": "t101-l1",
            "title": "What is Trading & Why People Trade",
            "duration": "18m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m2",
        "title": "Module 2: Understanding Financial Markets",
        "lessons": [
          {
            "id": "t101-l2",
            "title": "How Buyers and Sellers Meet in Markets",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m3",
        "title": "Module 3: Types of Financial Assets",
        "lessons": [
          {
            "id": "t101-l3",
            "title": "Stocks, Forex, Commodities, and Crypto",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m4",
        "title": "Module 4: How Does a Trade Work?",
        "lessons": [
          {
            "id": "t101-l4",
            "title": "Brokers, Exchanges, and Order Flow",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m5",
        "title": "Module 5: Basic Trading Terms",
        "lessons": [
          {
            "id": "t101-l5",
            "title": "Essential Vocabulary Every Trader Must Know",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m6",
        "title": "Module 6: Introduction to Charts",
        "lessons": [
          {
            "id": "t101-l6",
            "title": "Visualizing Price Over Time",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m7",
        "title": "Module 7: Reading a Simple Price Chart",
        "lessons": [
          {
            "id": "t101-l7",
            "title": "Navigating the X and Y Axes",
            "duration": "18m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m8",
        "title": "Module 8: Introduction to Candlesticks",
        "lessons": [
          {
            "id": "t101-l8",
            "title": "The Four Crucial Prices: OHLC",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m9",
        "title": "Module 9: Understanding Price Movement",
        "lessons": [
          {
            "id": "t101-l9",
            "title": "Supply and Demand Dynamics",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m10",
        "title": "Module 10: Time in Trading",
        "lessons": [
          {
            "id": "t101-l10",
            "title": "Intraday vs. Swing vs. Long-Term",
            "duration": "18m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m11",
        "title": "Module 11: Profit & Loss Basics",
        "lessons": [
          {
            "id": "t101-l11",
            "title": "Calculating P&L in Long and Short Trades",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m12",
        "title": "Module 12: Introduction to Trading Risk",
        "lessons": [
          {
            "id": "t101-l12",
            "title": "Capital Defense as Your Number One Job",
            "duration": "24m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m13",
        "title": "Module 13: Your First Simulated Trade",
        "lessons": [
          {
            "id": "t101-l13",
            "title": "Hands-On Simulated Order Execution",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "t101-m14",
        "title": "Module 14: Trading Basics Challenge",
        "lessons": [
          {
            "id": "t101-l14",
            "title": "Level 1 Final Assessment & Capstone Check",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      }
    ]
  },
  {
    "id": "chart-reading-101",
    "title": "Chart Reading 101",
    "tagline": "Confidently read and understand charts through visual observation and guided interpretation.",
    "category": "Price Action",
    "level": "Beginner",
    "levelNumber": 2,
    "levelName": "Level 2: Chart Reading",
    "rating": 4.87,
    "reviewsCount": 2750,
    "studentsCount": 15700,
    "totalModules": 14,
    "totalLessons": 14,
    "duration": "5h 00m",
    "progress": 0,
    "isEnrolled": false,
    "featured": true,
    "instructor": {
      "name": "Aman Singhania",
      "role": "Price Action Chart Specialist",
      "avatarBg": "from-purple-600 to-pink-600"
    },
    "description": "Course 2 moves from basic market concepts to hands-on visual literacy. Learn to observe candles, detect price direction, recognize timeframes, and read charts step-by-step without clutter.",
    "learnings": [
      "Master core concepts of Chart Reading 101",
      "Analyze charts with zero confusing indicator noise",
      "Apply rule-based principles under simulated market conditions",
      "Identify high-probability setups and protect capital"
    ],
    "modules": [
      {
        "id": "cr101-m1",
        "title": "Module 1: What is a Trading Chart?",
        "lessons": [
          {
            "id": "cr-l1",
            "title": "The Purpose of a Chart",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m2",
        "title": "Module 2: Understanding Price & Time",
        "lessons": [
          {
            "id": "cr-l2",
            "title": "The Interplay Between Price & Time",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m3",
        "title": "Module 3: Types of Charts",
        "lessons": [
          {
            "id": "cr-l3",
            "title": "Line, Bar, and Candlestick Charts Compared",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m4",
        "title": "Module 4: Understanding a Candlestick",
        "lessons": [
          {
            "id": "cr-l4",
            "title": "Deep Dive into Single Candle Geometry",
            "duration": "24m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m5",
        "title": "Module 5: Bullish & Bearish Candles",
        "lessons": [
          {
            "id": "cr-l5",
            "title": "Bullish Expansion vs. Bearish Rejection",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m6",
        "title": "Module 6: Candle Body & Wicks",
        "lessons": [
          {
            "id": "cr-l6",
            "title": "Decoding Wicks as Rejection Clues",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m7",
        "title": "Module 7: Reading Multiple Candles",
        "lessons": [
          {
            "id": "cr-l7",
            "title": "Connecting the Dots: Multi-Candle Sequences",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m8",
        "title": "Module 8: Understanding Timeframes",
        "lessons": [
          {
            "id": "cr-l8",
            "title": "From 1-Minute Scalping to Daily Swing Views",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m9",
        "title": "Module 9: Zooming Into a Chart",
        "lessons": [
          {
            "id": "cr-l9",
            "title": "Multi-Timeframe Fractal Perspective",
            "duration": "24m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m10",
        "title": "Module 10: Price Going Up & Down",
        "lessons": [
          {
            "id": "cr-l10",
            "title": "Recognizing Upward Waves & Downward Drops",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m11",
        "title": "Module 11: Simple Market Movements",
        "lessons": [
          {
            "id": "cr-l11",
            "title": "The Three States: Move, Pause, Reverse",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m12",
        "title": "Module 12: Reading a Chart Step-by-Step",
        "lessons": [
          {
            "id": "cr-l12",
            "title": "The 4-Step Chart Reading Checklist",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m13",
        "title": "Module 13: Chart Reading Practice Lab",
        "lessons": [
          {
            "id": "cr-l13",
            "title": "Guided Chart Inspection Drills",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "cr101-m14",
        "title": "Module 14: Chart Reading Challenge",
        "lessons": [
          {
            "id": "cr-l14",
            "title": "Final Chart Reading Evaluation",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      }
    ]
  },
  {
    "id": "reading-the-market",
    "title": "Reading the Market",
    "tagline": "Move from simply seeing a chart to understanding what price behavior is telling you.",
    "category": "Price Action",
    "level": "Beginner",
    "levelNumber": 3,
    "levelName": "Level 3: Reading the Market",
    "rating": 4.84,
    "reviewsCount": 2300,
    "studentsCount": 12900,
    "totalModules": 12,
    "totalLessons": 12,
    "duration": "4h 00m",
    "progress": 0,
    "isEnrolled": false,
    "featured": false,
    "instructor": {
      "name": "Vikram Malhotra",
      "role": "Market Structure Educator",
      "avatarBg": "from-emerald-600 to-teal-600"
    },
    "description": "Course 3 teaches learners how to move from passive chart viewing to active market interpretation. Learn to compare periods, recognize rising and falling sequences, and understand sideways value zones.",
    "learnings": [
      "Master core concepts of Reading the Market",
      "Analyze charts with zero confusing indicator noise",
      "Apply rule-based principles under simulated market conditions",
      "Identify high-probability setups and protect capital"
    ],
    "modules": [
      {
        "id": "rtm-m1",
        "title": "Module 1: Revisiting the Chart",
        "lessons": [
          {
            "id": "rtm-l1",
            "title": "Revisiting Market Geometry",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m2",
        "title": "Module 2: Understanding Candles",
        "lessons": [
          {
            "id": "rtm-l2",
            "title": "The Meaning Behind Candle Real Bodies",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m3",
        "title": "Module 3: One Candle vs Many Candles",
        "lessons": [
          {
            "id": "rtm-l3",
            "title": "Single Candle Signals in Context",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m4",
        "title": "Module 4: How Price Moves",
        "lessons": [
          {
            "id": "rtm-l4",
            "title": "Up, Down, and Sideways Regimes",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m5",
        "title": "Module 5: Reading Direction",
        "lessons": [
          {
            "id": "rtm-l5",
            "title": "Determining General Direction Without Jargon",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m6",
        "title": "Module 6: Rising & Falling Markets",
        "lessons": [
          {
            "id": "rtm-l6",
            "title": "Sequences of Expansion and Pullback",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m7",
        "title": "Module 7: Sideways Markets",
        "lessons": [
          {
            "id": "rtm-l7",
            "title": "The Dynamics of Consolidation",
            "duration": "20m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m8",
        "title": "Module 8: Important Price Areas",
        "lessons": [
          {
            "id": "rtm-l8",
            "title": "Locating Repetitive Decision Areas",
            "duration": "24m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m9",
        "title": "Module 9: Comparing Time Periods",
        "lessons": [
          {
            "id": "rtm-l9",
            "title": "Top-Down Multi-Timeframe Observation",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m10",
        "title": "Module 10: Reading a Chart as a Story",
        "lessons": [
          {
            "id": "rtm-l10",
            "title": "Synthesizing the Narrative of Price Action",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m11",
        "title": "Module 11: Basic Chart Analysis Practice",
        "lessons": [
          {
            "id": "rtm-l11",
            "title": "Hands-On Market Reading Lab",
            "duration": "25m",
            "type": "quiz",
            "completed": false
          }
        ]
      },
      {
        "id": "rtm-m12",
        "title": "Module 12: Market Reading Challenge",
        "lessons": [
          {
            "id": "rtm-l12",
            "title": "Final Market Interpretation Examination",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      }
    ]
  },
  {
    "id": "language-of-price",
    "title": "The Language of Price",
    "tagline": "Deeply understand price behavior, reactions, breakouts, pullbacks, and failed moves.",
    "category": "Price Action",
    "level": "Intermediate",
    "levelNumber": 4,
    "levelName": "Level 4: Price Action",
    "rating": 4.81,
    "reviewsCount": 1850,
    "studentsCount": 10100,
    "totalModules": 14,
    "totalLessons": 14,
    "duration": "6h 00m",
    "progress": 0,
    "isEnrolled": false,
    "featured": false,
    "instructor": {
      "name": "Dr. Ananya Sharma",
      "role": "Behavioral Price Action Head",
      "avatarBg": "from-amber-600 to-orange-600"
    },
    "description": "Course 4 is the foundation of genuine price action thinking. Move from 'What is happening?' to 'What does price's behavior indicate?' Interpret momentum, rejections, false breakouts, and multi-candle footprints in context.",
    "learnings": [
      "Master core concepts of The Language of Price",
      "Analyze charts with zero confusing indicator noise",
      "Apply rule-based principles under simulated market conditions",
      "Identify high-probability setups and protect capital"
    ],
    "modules": [
      {
        "id": "lop-m1",
        "title": "Module 1: Understanding Price Behaviour",
        "lessons": [
          {
            "id": "lop-l1",
            "title": "Non-Random Nature of Price Discovery",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m2",
        "title": "Module 2: Impulse & Correction",
        "lessons": [
          {
            "id": "lop-l2",
            "title": "Impulsive Expansion vs. Corrective Absorption",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m3",
        "title": "Module 3: Reading Price Reactions",
        "lessons": [
          {
            "id": "lop-l3",
            "title": "The Anatomy of a Key Level Reaction",
            "duration": "26m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m4",
        "title": "Module 4: Rejections",
        "lessons": [
          {
            "id": "lop-l4",
            "title": "Pin Bars, Wick Sweeps, and Sharp Reversals",
            "duration": "26m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m5",
        "title": "Module 5: Breakouts & Failed Breakouts",
        "lessons": [
          {
            "id": "lop-l5",
            "title": "Distinguishing Genuine Breakouts from Retail Traps",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m6",
        "title": "Module 6: Pullbacks",
        "lessons": [
          {
            "id": "lop-l6",
            "title": "Healthy Retracements vs. Deep Trend Fatigue",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m7",
        "title": "Module 7: Momentum",
        "lessons": [
          {
            "id": "lop-l7",
            "title": "Visualizing Acceleration and Deceleration",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m8",
        "title": "Module 8: Candlestick Behaviour",
        "lessons": [
          {
            "id": "lop-l8",
            "title": "Behavior Over Names: Reading Candle Pressure",
            "duration": "26m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m9",
        "title": "Module 9: Price & Volume Together",
        "lessons": [
          {
            "id": "lop-l9",
            "title": "Volume Confirmation and Divergence",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m10",
        "title": "Module 10: Market Context",
        "lessons": [
          {
            "id": "lop-l10",
            "title": "Context Dictates Outcome",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m11",
        "title": "Module 11: Multiple Clues, One Story",
        "lessons": [
          {
            "id": "lop-l11",
            "title": "Confluence: Bringing the Clues Together",
            "duration": "26m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m12",
        "title": "Module 12: Reading a Price Story",
        "lessons": [
          {
            "id": "lop-l12",
            "title": "Narrating Full Chart Developments",
            "duration": "30m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m13",
        "title": "Module 13: Price Action Practice Lab",
        "lessons": [
          {
            "id": "lop-l13",
            "title": "Interactive Historical Replay Lab",
            "duration": "30m",
            "type": "quiz",
            "completed": false
          }
        ]
      },
      {
        "id": "lop-m14",
        "title": "Module 14: Price Behaviour Challenge",
        "lessons": [
          {
            "id": "lop-l14",
            "title": "Price Action Mastery Certification",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      }
    ]
  },
  {
    "id": "building-trading-strategy",
    "title": "Building a Trading Strategy",
    "tagline": "Convert chart analysis into a structured, repeatable, rule-based trading approach.",
    "category": "Risk Management",
    "level": "Intermediate",
    "levelNumber": 5,
    "levelName": "Level 5: Strategy & Risk",
    "rating": 4.78,
    "reviewsCount": 1400,
    "studentsCount": 7300,
    "totalModules": 14,
    "totalLessons": 14,
    "duration": "5h 30m",
    "progress": 0,
    "isEnrolled": false,
    "featured": false,
    "instructor": {
      "name": "Capt. Arvind Nair",
      "role": "Quantitative Strategy & Risk Head",
      "avatarBg": "from-rose-600 to-red-600"
    },
    "description": "Course 5 teaches students to shift from prediction-based thinking ('I think price might go up') to rule-based thinking ('According to my strategy, condition X is met, entry at Y, invalidation at Z, and risk is defined'). Build, test, and apply a complete strategy.",
    "learnings": [
      "Master core concepts of Building a Trading Strategy",
      "Analyze charts with zero confusing indicator noise",
      "Apply rule-based principles under simulated market conditions",
      "Identify high-probability setups and protect capital"
    ],
    "modules": [
      {
        "id": "bts-m1",
        "title": "Module 1: What Makes a Trading Strategy?",
        "lessons": [
          {
            "id": "bts-l1",
            "title": "The Architecture of a Rule-Based Strategy",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m2",
        "title": "Module 2: Finding a Trading Opportunity",
        "lessons": [
          {
            "id": "bts-l2",
            "title": "Screening for High-Probability Conditions",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m3",
        "title": "Module 3: Entry Conditions",
        "lessons": [
          {
            "id": "bts-l3",
            "title": "Formulating Exact Entry Triggers",
            "duration": "26m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m4",
        "title": "Module 4: Exit Conditions",
        "lessons": [
          {
            "id": "bts-l4",
            "title": "Planning the Exit Before the Entry",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m5",
        "title": "Module 5: Stop Loss & Protection",
        "lessons": [
          {
            "id": "bts-l5",
            "title": "The Structural Invalidation Stop Loss",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m6",
        "title": "Module 6: Risk & Reward",
        "lessons": [
          {
            "id": "bts-l6",
            "title": "Asymmetric Risk-to-Reward Geometry",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m7",
        "title": "Module 7: Position Size Basics",
        "lessons": [
          {
            "id": "bts-l7",
            "title": "The 1% Capital Risk Formula",
            "duration": "26m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m8",
        "title": "Module 8: Trade Setup & Rules",
        "lessons": [
          {
            "id": "bts-l8",
            "title": "Documenting Your Strategy Checklist",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m9",
        "title": "Module 9: Simple Strategy Examples",
        "lessons": [
          {
            "id": "bts-l9",
            "title": "Classic Playbook Strategies Dissected",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m10",
        "title": "Module 10: When Not to Trade",
        "lessons": [
          {
            "id": "bts-l10",
            "title": "The Power of Sitting on Your Hands",
            "duration": "22m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m11",
        "title": "Module 11: Testing a Strategy",
        "lessons": [
          {
            "id": "bts-l11",
            "title": "Historical Replay & Forward Simulation",
            "duration": "28m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m12",
        "title": "Module 12: Keeping a Trading Journal",
        "lessons": [
          {
            "id": "bts-l12",
            "title": "The Post-Trade Review Process",
            "duration": "25m",
            "type": "video",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m13",
        "title": "Module 13: Strategy Lab",
        "lessons": [
          {
            "id": "bts-l13",
            "title": "Simulated Strategy Execution Lab",
            "duration": "30m",
            "type": "quiz",
            "completed": false
          }
        ]
      },
      {
        "id": "bts-m14",
        "title": "Module 14: Build Your First Strategy",
        "lessons": [
          {
            "id": "bts-l14",
            "title": "Capstone: Publishing Your Personal Trading Playbook",
            "duration": "35m",
            "type": "video",
            "completed": false
          }
        ]
      }
    ]
  }
];
