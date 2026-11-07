import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./music.css";
import { Analytics } from "@vercel/analytics/react";
import { I18nProvider, resolveInitialI18n } from "./i18n/I18nProvider";

document.documentElement.classList.remove("light-mode");

const bootstrap = async () => {
	const { locale, dictionary } = await resolveInitialI18n();
	createRoot(document.getElementById("root")!).render(
		<I18nProvider initialLocale={locale} initialDictionary={dictionary}>
			<App />
			{(window.location.hostname.endsWith('.vercel.app') || ['unseenfoundation.app', 'www.unseenfoundation.app'].includes(window.location.hostname)) && <Analytics />}
		</I18nProvider>,
	);
};

void bootstrap();
