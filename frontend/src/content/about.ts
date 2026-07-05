export const APP_ABOUT = {
  productName: "Training Hub",
  companyName: "Betcloud",
  authorName: "Jarosław Bętkowski",
  internalLabel: "Betcloud Internal",
  currentVersion: "0.9.4-dev",
  repoUrl: "",
  changelog: [
    {
      version: "0.9.4-dev",
      date: "2026-06-12",
      itemsPl: [
        "Maile przypominające o wygasających szkoleniach obowiązkowych pokazują Local SAP ID obok imienia i nazwiska pracownika, jeśli numer jest dostępny.",
      ],
      itemsEn: [
        "Mandatory training reminder emails now show Local SAP ID next to the employee name when the value is available.",
      ],
    },
    {
      version: "0.9.3-dev",
      date: "2026-06-12",
      itemsPl: [
        "Import szkoleń obowiązkowych ma odporniejszy parser dat dla plików CSV i XLSX.",
        "Daty typu 27.06.2017 17:00:00 są poprawnie rozpoznawane jako data rozpoczęcia.",
        "Rekordy z datą rozpoczęcia i bez daty wygaśnięcia trafiają poprawnie do zakładki Bezterminowe.",
      ],
      itemsEn: [
        "Mandatory training import now has a more resilient date parser for CSV and XLSX files.",
        "Dates such as 27.06.2017 17:00:00 are correctly recognized as start dates.",
        "Records with a start date and without an expiration date are correctly classified as Indefinite.",
      ],
    },
    {
      version: "0.9.2-dev",
      date: "2026-06-12",
      itemsPl: [
        "Import szkoleń obowiązkowych obsługuje teraz pliki XLSX i CSV z Workday.",
        "Przełącznik okna zbierania wniosków w panelu admina działa jako czytelny switch on/off.",
        "Dialog dodawania pozycji ma ikony pomocy z opisem każdego pola w języku polskim i angielskim.",
      ],
      itemsEn: [
        "Mandatory training import now supports Workday XLSX and CSV files.",
        "The admin collection window control now uses a clear on/off switch.",
        "The add item dialog includes help icons with Polish and English explanations for every field.",
      ],
    },
    {
      version: "0.9.1",
      date: "2026-03-16",
      itemsPl: [
        "Nowy dashboard z warstwą statystyk, modułowym podziałem i bardziej efektownymi wizualizacjami.",
        "Przebudowana sekcja O aplikacji bez duplikowania bibliotek oraz z mocniejszym podkreśleniem architektury produktu.",
        "Powiadomienia pogrupowane na moduł Training Hub i szkolenia obowiązkowe.",
      ],
      itemsEn: [
        "New dashboard with a richer stats layer, module split and more expressive visuals.",
        "Rebuilt About section without duplicated library cards and with stronger product architecture storytelling.",
        "Notifications grouped into the requests and mandatory trainings modules.",
      ],
    },
    {
      version: "0.9.0",
      date: "2026-03-16",
      itemsPl: [
        "Reset hasła z bezpiecznym linkiem i walidacją tokenu.",
        "Centrum pomocy, wprowadzenie oraz oprowadzanie po interfejsie.",
        "Strona O aplikacji z prezentacją technologii, changelogiem i sekcją brandową.",
      ],
      itemsEn: [
        "Password reset with a secure link and token validation.",
        "Help Center, introduction and guided interface walkthrough.",
        "About page with technology showcase, changelog and brand section.",
      ],
    },
    {
      version: "0.8.0",
      date: "2026-03-16",
      itemsPl: [
        "Grupowane powiadomienia dla wniosków szkoleniowych oraz szkoleń obowiązkowych.",
        "Profil użytkownika z hasłem, językiem, motywem i avatarem.",
        "Bezpieczna warstwa SMTP/relay z logami prób wysyłki.",
      ],
      itemsEn: [
        "Grouped notifications for training requests and mandatory trainings.",
        "User profile with password, language, theme and avatar settings.",
        "Safe SMTP/relay layer with delivery attempt logs.",
      ],
    },
    {
      version: "0.7.0",
      date: "2026-03-15",
      itemsPl: [
        "Moduł szkoleń obowiązkowych z importem Excela, mapowaniem obszarów i alertami.",
      ],
      itemsEn: [
        "Mandatory trainings module with Excel import, area mapping and alerts.",
      ],
    },
  ],
  technologies: [
    { name: "React", short: "R", usagePl: "interfejs aplikacji i routing", usageEn: "application UI and routing" },
    { name: "TypeScript", short: "TS", usagePl: "typowanie i bezpieczniejszy frontend", usageEn: "type safety and a more reliable frontend" },
    { name: "Tailwind CSS", short: "TW", usagePl: "warstwa wizualna i utility classes", usageEn: "visual layer and utility-first styling" },
    { name: "shadcn/ui", short: "UI", usagePl: "spójne komponenty formularzy, kart i dialogów", usageEn: "consistent form, card and dialog components" },
    { name: "Framer Motion", short: "FM", usagePl: "animacje przejść, mikrointerakcje i dopieszczenie ruchu", usageEn: "transitions, micro-interactions and motion polish" },
    { name: "Lucide React", short: "LR", usagePl: "ikonografia całego interfejsu", usageEn: "iconography across the whole interface" },
    { name: "FastAPI", short: "FA", usagePl: "REST API, autoryzacja i workflow aplikacji", usageEn: "REST API, auth and workflow logic" },
    { name: "SQLAlchemy", short: "SA", usagePl: "modele danych i operacje na bazie", usageEn: "data models and database operations" },
    { name: "Alembic", short: "AL", usagePl: "migracje schematu bazy danych", usageEn: "database schema migrations" },
    { name: "PostgreSQL", short: "PG", usagePl: "główna baza danych systemu", usageEn: "main application database" },
    { name: "React Query", short: "RQ", usagePl: "cache danych i synchronizacja z API", usageEn: "data caching and API synchronization" },
    { name: "React Hook Form", short: "RHF", usagePl: "obsługa formularzy i walidacji w widokach", usageEn: "forms handling and validation in complex views" },
  ],
};
