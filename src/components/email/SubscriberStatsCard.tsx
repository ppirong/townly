'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SubscriberStatsCardProps {
  stats: {
    totalUsers: number;
    subscribedUsers: number;
    weatherEmailUsers: number;
    morningEmailUsers: number;
    eveningEmailUsers: number;
  };
}

export function SubscriberStatsCard({ stats }: SubscriberStatsCardProps) {
  const subscriptionRate = stats.totalUsers > 0 
    ? Math.round((stats.subscribedUsers / stats.totalUsers) * 100)
    : 0;

  const morningRate = stats.subscribedUsers > 0
    ? Math.round((stats.morningEmailUsers / stats.subscribedUsers) * 100)
    : 0;

  const eveningRate = stats.subscribedUsers > 0
    ? Math.round((stats.eveningEmailUsers / stats.subscribedUsers) * 100)
    : 0;

  const statCards = [
    {
      title: '전체 사용자',
      value: stats.totalUsers,
      description: '가입한 모든 사용자',
      icon: '👥',
      badge: null,
    },
    {
      title: '구독자',
      value: stats.subscribedUsers,
      description: '이메일 수신 동의한 사용자',
      icon: '📧',
      badge: `${subscriptionRate}%`,
    },
    {
      title: '날씨 이메일',
      value: stats.weatherEmailUsers,
      description: '날씨 안내 이메일 수신자',
      icon: '🌤️',
      badge: stats.subscribedUsers > 0 
        ? `${Math.round((stats.weatherEmailUsers / stats.subscribedUsers) * 100)}%`
        : '0%',
    },
    {
      title: '아침 이메일',
      value: stats.morningEmailUsers,
      description: '아침 날씨 이메일 수신자',
      icon: '🌅',
      badge: `${morningRate}%`,
    },
    {
      title: '저녁 이메일',
      value: stats.eveningEmailUsers,
      description: '저녁 날씨 이메일 수신자',
      icon: '🌆',
      badge: `${eveningRate}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <span className="text-2xl">{stat.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              {stat.badge && (
                <Badge variant="secondary">{stat.badge}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

