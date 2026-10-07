import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./music.css";
import { Analytics } from "@vercel/analytics/react";
import { I18nProvider, resolveInitialI18n } from "./i18n/I18nProvider";

const bootstrap = async () => {
	const { locale, dictionary } = await resolveInitialI18n();
	createRoot(document.getElementById("root")!).render(
		<I18nProvider initialLocale={locale} initialDictionary={dictionary}>
			<App />
			<Analytics />
		</I18nProvider>,
	);
};

void bootstrap();
