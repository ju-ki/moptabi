'use client';

import React from 'react';
import { MapPin, Calendar, History, Sparkles, Users, CloudSun, ArrowRight, LucideIcon } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Step {
  id: number;
  title: string;
  description: string;
  content: string;
  linkText: string;
  linkHref: string;
  icon: LucideIcon;
  colors: {
    bar: string;
    bg: string;
    icon: string;
    text: string;
    iconText: string;
  };
}

const STEPS: Step[] = [
  {
    id: 1,
    title: '1. 見つける・集める',
    description: 'Discover & Wishlist',
    content: '気になった場所はすぐに「行きたいリスト」へ。Google Maps連携で、詳細な情報もその場でチェックできます。',
    linkText: 'スポットを探しに行く',
    linkHref: '/wishlist',
    icon: MapPin,
    colors: {
      bar: 'bg-blue-500',
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      text: 'text-blue-600',
      iconText: 'group-hover:bg-blue-500',
    },
  },
  {
    id: 2,
    title: '2. 自由に計画する',
    description: 'Create Your Plan',
    content: '行きたい場所を並べるだけ。移動時間もルートも自動計算。あなただけの無理のない旅程を作成しましょう。',
    linkText: 'プランを作成する',
    linkHref: '/plan/create',
    icon: Calendar,
    colors: {
      bar: 'bg-indigo-500',
      bg: 'bg-indigo-100',
      icon: 'text-indigo-600',
      text: 'text-indigo-600',
      iconText: 'group-hover:bg-indigo-500',
    },
  },
  {
    id: 3,
    title: '3. 思い出を残す',
    description: 'Log & Memories',
    content: '旅の記録はマイページに蓄積。訪れた場所、作成したプランを見返して、次の旅へのインスピレーションに。',
    linkText: 'マイページを見る',
    linkHref: '/mypage',
    icon: History,
    colors: {
      bar: 'bg-teal-500',
      bg: 'bg-teal-100',
      icon: 'text-teal-600',
      text: 'text-teal-600',
      iconText: 'group-hover:bg-teal-500',
    },
  },
];

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  colors: {
    bg: string;
    iconBg: string;
    icon: string;
    border: string;
  };
}

const FUTURE_FEATURES: Feature[] = [
  {
    id: 1,
    title: 'AI コンシェルジュ',
    description: 'あなたの好みを学習し、最適なプランを自動提案。',
    icon: Sparkles,
    colors: {
      bg: 'hover:bg-purple-50/50',
      iconBg: 'bg-purple-100',
      icon: 'text-purple-600',
      border: 'hover:border-purple-200',
    },
  },
  {
    id: 2,
    title: '旅のシェアと共同編集',
    description: '友人や家族とプランを共有。リアルタイムで一緒に編集できます。',
    icon: Users,
    colors: {
      bg: 'hover:bg-pink-50/50',
      iconBg: 'bg-pink-100',
      icon: 'text-pink-600',
      border: 'hover:border-pink-200',
    },
  },
  {
    id: 3,
    title: '天気予報・パッキング',
    description: '旅先の天気に合わせた持ち物リストを自動生成。',
    icon: CloudSun,
    colors: {
      bg: 'hover:bg-sky-50/50',
      iconBg: 'bg-sky-100',
      icon: 'text-sky-600',
      border: 'hover:border-sky-200',
    },
  },
];

const Home = () => {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* ヒーローセクション */}
      <section className="relative w-full py-20 md:py-32 flex items-center justify-center bg-gray-950 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <Image
            src="/hero-bg.svg"
            alt="MopTabi Abstract Background"
            fill
            className="object-cover opacity-80"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-90" />
        </div>

        <div className="container relative z-10 px-4 md:px-6 text-center text-white">
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-1 text-sm bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm"
          >
            モプタビ - もっと旅がしたくなる
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            もっと、
            <br className="md:hidden" />
            旅がしたくなる。
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-gray-200 mb-8">
            次の旅が見つかる、計画が決まる、思い出が残る。
            <br />
            「モプタビ」は、あなたの旅のサイクルを加速させる
            <br className="hidden md:inline" />
            新しいトラベルパートナーです。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <>
                <Button size="lg" className="h-12 px-8 text-base bg-white text-gray-900 hover:bg-gray-100" asChild>
                  <Link href="/plan/create">
                    旅を計画する <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base bg-transparent border-white text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/wishlist">スポットを探す</Link>
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="h-12 px-8 text-base bg-white text-gray-900 hover:bg-gray-100"
                onClick={() => signIn('google')}
                disabled={isLoading}
              >
                無料で始める
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* サイクル機能紹介セクション (The Travel Cycle) */}
      <section className="w-full py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-gray-900">旅をデザインする3つのステップ</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              「探す」「計画する」「振り返る」。
              <br />
              シンプルな機能がつながって、あなたの旅をより豊かにします。
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <Card
                key={step.id}
                className="border-none shadow-lg bg-white relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
              >
                <div className={`absolute top-0 left-0 w-2 h-full ${step.colors.bar}`} />
                <CardHeader>
                  <div
                    className={`h-12 w-12 rounded-full ${step.colors.bg} flex items-center justify-center mb-4 ${step.colors.iconText} transition-colors duration-300`}
                  >
                    <step.icon className={`h-6 w-6 ${step.colors.icon} group-hover:text-white`} />
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6 min-h-[4rem]">{step.content}</p>
                  {isAuthenticated && (
                    <Button variant="link" className={`p-0 ${step.colors.text} h-auto font-semibold`} asChild>
                      <Link href={step.linkHref}>{step.linkText} &rarr;</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 将来のロードマップ (Future Features) */}
      <section className="w-full py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-purple-500 text-purple-600">
              Roadmap
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">Coming Soon</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              より便利な機能が続々と登場予定です。
              <br />
              進化し続けるモプタビにご期待ください。
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FUTURE_FEATURES.map((feature) => (
              <div
                key={feature.id}
                className={`flex items-start p-6 rounded-xl border border-gray-100 transition-colors ${feature.colors.border} ${feature.colors.bg}`}
              >
                <div
                  className={`mt-1 mr-4 h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${feature.colors.iconBg}`}
                >
                  <feature.icon className={`h-5 w-5 ${feature.colors.icon}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1 flex items-center gap-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
