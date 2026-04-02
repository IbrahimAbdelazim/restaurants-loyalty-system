"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(201,168,76,0.05) 0%, transparent 40%)`,
        }}
      />
      <div className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 text-center space-y-12 px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="text-7xl mb-6 inline-block"
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
          >
            🍽️
          </motion.div>
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="gold-text">Table & Trust</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">Restaurant Loyalty Platform</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </motion.div>

        {/* App cards */}
        <motion.div
          className="flex gap-6 justify-center flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <AppCard
            href="/waiter"
            emoji="👨‍🍳"
            title="Waiter App"
            subtitle="Tablet · Guest lookup"
            description="Search guests, view loyalty history, family profiles & preferences"
            delay={0.4}
            accent
          />
          <AppCard
            href="/cashier"
            emoji="🧾"
            title="Cashier App"
            subtitle="POS · Order entry"
            description="Build orders, confirm payments, sync to loyalty system instantly"
            delay={0.55}
          />
          <AppCard
            href="/manager"
            emoji="📊"
            title="Manager dashboard"
            subtitle="Analytics · KPIs"
            description="Revenue, popular items, tier mix, and upcoming guest occasions"
            delay={0.7}
          />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-muted-foreground/50 text-sm">
            Open waiter & cashier side-by-side to simulate the live flow
          </p>
          <ThemeToggle />
        </motion.div>
      </div>
    </div>
  );
}

function AppCard({
  href, emoji, title, subtitle, description, delay, accent,
}: {
  href: string; emoji: string; title: string; subtitle: string;
  description: string; delay: number; accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link href={href} className="block">
        <div className={`
          relative w-64 p-7 rounded-2xl transition-all duration-300 group
          ${accent
            ? "bg-[#C9A84C] text-[#0F0D09]"
            : "glass hover:bg-white/[0.07]"
          }
        `}>
          {accent && (
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96A)" }}
            />
          )}
          <div className="relative z-10">
            <div className="text-5xl mb-4">{emoji}</div>
            <p className={`font-bold text-xl ${accent ? "text-[#0F0D09]" : "text-foreground"}`}>{title}</p>
            <p className={`text-xs mt-1 mb-3 font-medium ${accent ? "text-[#0F0D09]/60" : "text-[#C9A84C]"}`}>{subtitle}</p>
            <p className={`text-sm leading-relaxed ${accent ? "text-[#0F0D09]/70" : "text-muted-foreground"}`}>{description}</p>
          </div>
          <motion.div
            className={`absolute bottom-4 right-4 text-lg ${accent ? "text-[#0F0D09]/40" : "text-[#C9A84C]/40"}`}
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
          >
            →
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
