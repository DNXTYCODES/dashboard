'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { FiActivity, FiServer, FiDollarSign, FiClock, FiBox, FiDatabase } from 'react-icons/fi';
import { fetchNetworkStats, fetchTVLHistory, fetchEpochInfo } from '@/services/networkStats';
import { useWallet } from '@solana/wallet-adapter-react';
import SkeletonLoader from '@/components/SkeletonLoader';
import axios from 'axios';

interface NetworkStats {
  currentTvl: number;
  activeValidators: number;
  averageCommission: number;
  blockTime: number;
  epochProgress: number;
  transactionVolume: number;
}

interface EpochInfo {
  currentEpoch: number;
  progress: number;
  remainingTime: string;
}

interface TVLData {
  date: string;
  value: number;
}

interface ValidatorPerformanceData {
  date: string;
  uptime: number;
  commission: number;
  votes: number;
}

const calculateTvlChange = (data: TVLData[]) => {
  if (data.length < 2) return '0.00';
  const first = data[0].value;
  const last = data[data.length - 1].value;
  return (((last - first) / first) * 100).toFixed(2);
};

const NetworkStatsPage = () => {
  const { isDarkMode } = useTheme();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(true);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [tvlHistory, setTvlHistory] = useState<TVLData[]>([]);
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stats, tvl, epoch] = await Promise.all([
          fetchNetworkStats(),
          fetchTVLHistory('7d'),
          fetchEpochInfo()
        ]);
        
        setNetworkStats(stats);
        setTvlHistory(tvl);
        setEpochInfo(epoch);
      } catch (err) {
        setError('Failed to load network statistics');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className={`min-h-screen p-8 flex items-center justify-center ${isDarkMode ? 'bg-dark-bg' : 'bg-light-bg'}`}>
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  if (loading || !networkStats || !epochInfo) {
    return <SkeletonLoader />;
  }

  return (
    <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-dark-bg' : 'bg-light-bg'}`}>
      <div className="max-w-7xl mx-auto">
        <h1 className={`text-3xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-dark-base'}`}>
          Network Statistics {publicKey && `for ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`}
        </h1>
        
        <StatsGrid isDarkMode={isDarkMode} stats={networkStats} tvlHistory={tvlHistory} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <TVLChart isDarkMode={isDarkMode} data={tvlHistory} />
          <EpochProgress isDarkMode={isDarkMode} epochInfo={epochInfo} />
        </div>

        <ValidatorPerformanceChart isDarkMode={isDarkMode} publicKey={publicKey} />
      </div>
    </div>
  );
};

const StatsGrid = ({ isDarkMode, stats, tvlHistory }: { isDarkMode: boolean, stats: NetworkStats, tvlHistory: TVLData[] }) => {
  const statsConfig = [
    {
      title: 'Total Value Locked',
      value: `$${(stats.currentTvl / 1e9).toFixed(2)}B`,
      icon: <FiDollarSign size={24} />,
      change: `${calculateTvlChange(tvlHistory)}%`
    },
    {
      title: 'Active Validators',
      value: stats.activeValidators.toLocaleString(),
      icon: <FiServer size={24} />,
      change: 'N/A'
    },
    {
      title: 'Avg Commission',
      value: `${stats.averageCommission.toFixed(2)}%`,
      icon: <FiActivity size={24} />,
      change: 'N/A'
    },
    {
      title: 'Block Time',
      value: `${stats.blockTime.toFixed(2)}s`,
      icon: <FiClock size={24} />,
      change: 'N/A'
    },
    {
      title: 'Transaction Volume',
      value: `$${(stats.transactionVolume / 1e6).toFixed(2)}M`,
      icon: <FiDatabase size={24} />,
      change: 'N/A'
    },
    {
      title: 'Epoch Progress',
      value: `${stats.epochProgress.toFixed(1)}%`,
      icon: <FiBox size={24} />,
      change: 'N/A'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {statsConfig.map((stat, index) => (
        <div
          key={index}
          className={`p-6 rounded-xl ${
            isDarkMode ? 'bg-dark-card hover:bg-dark-card-hover' : 'bg-light-card hover:bg-light-card-hover'
          } transition-all duration-200`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.title}</div>
              <div className={`text-2xl font-bold mt-2 ${isDarkMode ? 'text-white' : 'text-dark-base'}`}>
                {stat.value}
              </div>
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-dark-accent' : 'bg-light-accent'}`}>
              {stat.icon}
            </div>
          </div>
          <div className={`mt-4 text-sm ${stat.change.startsWith('-') ? 'text-red-500' : 'text-green-500'}`}>
            {stat.change !== 'N/A' && (
              <span>{stat.change} {stat.change !== 'N/A' && 'from last period'}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const TVLChart = ({ isDarkMode, data }: { isDarkMode: boolean, data: TVLData[] }) => {
  return (
    <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-dark-card' : 'bg-light-card'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark-base'}`}>
        TVL History (7D)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="date"
              stroke={isDarkMode ? '#94a3b8' : '#64748b'}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke={isDarkMode ? '#94a3b8' : '#64748b'}
              tickFormatter={(value) => `$${value / 1e9}B`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                borderRadius: '8px'
              }}
              formatter={(value) => `$${(Number(value) / 1e9).toFixed(2)}B`}
            />
            <Bar
              dataKey="value"
              fill={isDarkMode ? '#3b82f6' : '#2563eb'}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const EpochProgress = ({ isDarkMode, epochInfo }: { isDarkMode: boolean, epochInfo: EpochInfo }) => {
  const [progress, setProgress] = useState(epochInfo.progress);

  useEffect(() => {
    setProgress(epochInfo.progress);
  }, [epochInfo.progress]);

  return (
    <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-dark-card' : 'bg-light-card'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark-base'}`}>
        Epoch Progress (Current: {epochInfo.currentEpoch})
      </h3>
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-40 h-40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-dark-base'}`}>
              {progress.toFixed(1)}%
            </div>
          </div>
          <svg className="transform -rotate-90 w-40 h-40">
            <circle
              cx="80"
              cy="80"
              r="72"
              stroke={isDarkMode ? '#334155' : '#e2e8f0'}
              strokeWidth="16"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r="72"
              stroke={isDarkMode ? '#3b82f6' : '#2563eb'}
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(2 * Math.PI * 72) * (progress / 100)} ${2 * Math.PI * 72}`}
            />
          </svg>
        </div>
        <div className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Time remaining: {epochInfo.remainingTime}
        </div>
      </div>
    </div>
  );
};

const ValidatorPerformanceChart = ({ isDarkMode, publicKey }: { isDarkMode: boolean, publicKey: any }) => {
  const [performanceData, setPerformanceData] = useState<ValidatorPerformanceData[]>([]);

  useEffect(() => {
    const loadValidatorData = async () => {
      if (publicKey) {
        try {
          const response = await axios.get(`/api/validators/${publicKey.toString()}/performance`);
          setPerformanceData(response.data);
        } catch (error) {
          console.error('Error loading validator performance:', error);
        }
      }
    };
    loadValidatorData();
  }, [publicKey]);

  return (
    <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-dark-card' : 'bg-light-card'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-dark-base'}`}>
        Validator Performance
      </h3>
      {publicKey ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
              <XAxis
                dataKey="date"
                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke={isDarkMode ? '#94a3b8' : '#64748b'}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="uptime"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="commission"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={`h-64 flex items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Connect wallet to view validator performance
        </div>
      )}
    </div>
  );
};

export default NetworkStatsPage;
