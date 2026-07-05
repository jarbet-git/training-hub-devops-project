import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Building2,
  Gauge,
  Palette,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/BrandLogo";
import { TechStackIcon } from "@/components/TechStackIcon";
import { useI18n } from "@/app/i18n";
import { APP_ABOUT } from "@/content/about";
import { cn } from "@/lib/utils";

type ModuleCardProps = {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  points: string[];
  accentClassName?: string;
};

type PillarCardProps = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

function ModuleCard({ title, subtitle, icon: Icon, points, accentClassName }: ModuleCardProps) {
  return (
    <Card className={cn("glass-card rounded-[30px] border-white/10 bg-card/70", accentClassName)}>
      <CardHeader className="gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-background/70 text-primary shadow-[0_18px_45px_-28px_hsl(var(--primary)/0.85)]">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm leading-6">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {points.map((point) => (
            <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-background/45 px-4 py-3 text-sm text-muted-foreground">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PillarCard({ title, body, icon: Icon }: PillarCardProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-background/55 p-5 shadow-[0_24px_80px_-58px_hsl(var(--primary)/0.55)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-base font-semibold">{title}</div>
      </div>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">{body}</p>
    </div>
  );
}

export function AboutPage() {
  const { lang } = useI18n();

  const moduleCards: ModuleCardProps[] = [
    {
      title: lang === "en" ? "training request workflow" : "Workflow wniosków szkoleniowych",
      subtitle:
        lang === "en"
          ? "Training requests, decisions, proposal reviews and process flow in one place."
          : "Wnioski szkoleniowe, decyzje, przegląd propozycji i przepływ procesu w jednym miejscu.",
      icon: Workflow,
      points:
        lang === "en"
          ? [
              "Editor → manager → HR flow with role-aware views and actions.",
              "Request details, comments, history and decision context kept in one thread.",
              "Training proposals extend the shared catalog without breaking the workflow.",
            ]
          : [
              "Przepływ editor → manager → HR z widokami i akcjami zależnymi od roli.",
              "Szczegóły wniosku, komentarze, historia i kontekst decyzji w jednym miejscu.",
              "Propozycje szkoleń rozwijają wspólny katalog bez rozbijania workflow.",
            ],
      accentClassName: "bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.20),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]",
    },
    {
      title: lang === "en" ? "Mandatory trainings" : "Szkolenia obowiązkowe",
      subtitle:
        lang === "en"
          ? "Import, expiry monitoring and alerts for operational follow-up."
          : "Import, monitoring terminów i alerty do operacyjnego nadzoru.",
      icon: ShieldCheck,
      points:
        lang === "en"
          ? [
              "Excel import from the source report with mapping to Training Hub structures.",
              "Risk visibility for overdue, 7-day and 30-day windows.",
              "Shared alert surface in both the bell and the dashboard overview.",
            ]
          : [
              "Import Excela z raportu źródłowego wraz z mapowaniem do struktur Training Hub.",
              "Widoczność ryzyka dla rekordów po terminie, do 7 dni i do 30 dni.",
              "Wspólna warstwa alertów w dzwonku i na dashboardzie.",
            ],
      accentClassName: "bg-[radial-gradient(circle_at_top_right,hsl(var(--chart-2)/0.18),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]",
    },
  ];

  const pillars: PillarCardProps[] = [
    {
      title: lang === "en" ? "Operational visibility" : "Widoczność operacyjna",
      body:
        lang === "en"
          ? "The interface is designed around actions, backlog and risk instead of static navigation. Users should instantly see what requires attention."
          : "Interfejs jest projektowany wokół działań, backlogu i ryzyka zamiast statycznej nawigacji. Użytkownik ma od razu widzieć, co wymaga uwagi.",
      icon: Gauge,
    },
    {
      title: lang === "en" ? "Guidance and self-service" : "Prowadzenie i self-service",
      body:
        lang === "en"
          ? "The platform combines onboarding, help, notifications, profile settings and password reset so that the user does not depend on admin-only knowledge."
          : "Platforma łączy oprowadzanie, pomoc, powiadomienia, ustawienia profilu i reset hasła, żeby użytkownik nie był zależny od wiedzy dostępnej tylko po stronie admina.",
      icon: BellRing,
    },
    {
      title: lang === "en" ? "Visual system" : "Warstwa wizualna",
      body:
        lang === "en"
          ? "Glass panels, gradients, motion accents and a stronger color identity make the portal feel more premium without reducing readability."
          : "Szklane panele, gradienty, akcenty ruchu i mocniejsza identyfikacja kolorystyczna nadają portalowi bardziej premium charakter bez utraty czytelności.",
      icon: Palette,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden md:space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_28%),radial-gradient(circle_at_bottom_right,hsl(var(--chart-2)/0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent)] p-5 shadow-[0_38px_140px_-74px_hsl(var(--primary)/0.8)] backdrop-blur-xl sm:p-6 md:p-8 xl:p-10">
        <div className="pointer-events-none absolute inset-0 mesh-grid opacity-35" />
        <div className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-chart-2/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/45 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {lang === "en" ? "About the platform" : "O platformie"}
            </div>

            <BrandLogo
              size="lg"
              subtitle={lang === "en" ? "Training operations portal" : "Portal obsługi procesów szkoleniowych"}
            />

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-background/45 px-3 py-1">{APP_ABOUT.companyName}</span>
              <span className="rounded-full border border-white/10 bg-background/45 px-3 py-1">{APP_ABOUT.internalLabel}</span>
              <span className="rounded-full border border-white/10 bg-background/45 px-3 py-1">v{APP_ABOUT.currentVersion}</span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">
                {lang === "en"
                  ? "One portal for training workflow, mandatory training monitoring and daily operational work"
                  : "Jeden portal do workflow szkoleń, monitoringu szkoleń obowiązkowych i codziennej pracy operacyjnej"}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {lang === "en"
                  ? "Training Hub connects request handling, mandatory trainings, grouped notifications, self-service profile features and onboarding support into one interface prepared for internal Betcloud use."
                  : "Training Hub łączy obsługę wniosków, szkolenia obowiązkowe, grupowane powiadomienia, samoobsługę użytkownika i wsparcie wdrożeniowe w jeden interfejs przygotowany do wewnętrznego użycia w Betcloud."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  label: lang === "en" ? "Company" : "Firma",
                  value: APP_ABOUT.companyName,
                  icon: Building2,
                },
                {
                  label: lang === "en" ? "Author" : "Autor",
                  value: APP_ABOUT.authorName,
                  icon: UserRound,
                },
                {
                  label: lang === "en" ? "Core modules" : "Główne moduły",
                  value: lang === "en" ? "Requests + mandatory" : "Wnioski + obowiązkowe",
                  icon: Workflow,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-background/55 p-4 backdrop-blur">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm font-medium leading-6">{item.value}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl shadow-[0_24px_60px_-32px_hsl(var(--primary)/0.95)]">
                <a href="#changelog">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {lang === "en" ? "View changelog" : "Zobacz changelog"}
                </a>
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid gap-4"
          >
            {moduleCards.map((module, index) => (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * index }}
              >
                <ModuleCard {...module} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="glass-card rounded-[30px] border-white/10 bg-card/70">
          <CardHeader className="gap-3">
            <CardTitle className="text-2xl tracking-tight">
              {lang === "en" ? "How the platform is composed" : "Jak zbudowana jest platforma"}
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-7">
              {lang === "en"
                ? "The section below shows how the technologies work together across interface, workflow and data persistence."
                : "Poniżej widać, jak technologie współpracują ze sobą pomiędzy interfejsem, workflow i warstwą danych."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: lang === "en" ? "Experience layer" : "Warstwa doświadczenia",
                  body:
                    lang === "en"
                      ? "React, TypeScript, Tailwind and shadcn/ui build consistent screens, forms and panels. Framer Motion and Lucide finish the interaction layer."
                      : "React, TypeScript, Tailwind i shadcn/ui budują spójne ekrany, formularze i panele. Framer Motion i Lucide domykają warstwę interakcji.",
                  tech: ["React", "TypeScript", "Tailwind CSS", "shadcn/ui", "Framer Motion", "Lucide React"],
                },
                {
                  title: lang === "en" ? "Workflow layer" : "Warstwa workflow",
                  body:
                    lang === "en"
                      ? "FastAPI contains business rules, permissions, notifications and the orchestration between requests and mandatory trainings."
                      : "FastAPI zawiera reguły biznesowe, uprawnienia, powiadomienia i orkiestrację pomiędzy wnioskami szkoleniowymi a szkoleniami obowiązkowymi.",
                  tech: ["FastAPI", "React Query", "React Hook Form"],
                },
                {
                  title: lang === "en" ? "Persistence layer" : "Warstwa danych",
                  body:
                    lang === "en"
                      ? "PostgreSQL stores core data, SQLAlchemy models it and Alembic keeps schema evolution controlled across iterations."
                      : "PostgreSQL przechowuje dane główne, SQLAlchemy je modeluje, a Alembic pilnuje kontrolowanej ewolucji schematu przy kolejnych iteracjach.",
                  tech: ["PostgreSQL", "SQLAlchemy", "Alembic"],
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[28px] border border-white/10 bg-background/50 p-5">
                  <div className="text-base font-semibold">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tech.map((tech) => (
                      <div key={tech} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                        <TechStackIcon label={tech} className="h-7 w-7 rounded-xl" />
                        <span>{tech}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {pillars.map((pillar) => (
            <PillarCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </section>

      <section id="changelog" className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Changelog</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {lang === "en"
              ? "Below you can find the history of the most important changes introduced in the platform."
              : "Poniżej znajduje się historia najważniejszych zmian wprowadzanych w platformie."}
          </p>
        </div>

        <div className="grid gap-4">
          {APP_ABOUT.changelog.map((entry, index) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.28, delay: index * 0.03 }}
            >
              <Card className="glass-card rounded-[30px] border-white/10 bg-card/70">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-xl">{entry.version}</CardTitle>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/45 px-3 py-1 text-xs text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" />
                      {entry.date}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {(lang === "en" ? entry.itemsEn : entry.itemsPl).map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-background/45 px-4 py-3 text-sm text-muted-foreground">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
