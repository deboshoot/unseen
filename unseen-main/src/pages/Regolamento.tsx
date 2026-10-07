import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarDays, Camera, ClipboardCheck, Copyright, Layers3, LockKeyhole, Music2, ShieldCheck, Trophy, Vote } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import '@/rules.css';

type Article = { title: string; intro?: string; rules?: { label: string; text: string }[] };
type Stat = { value: string; label: string };
type Round = { title: string; participants: string; matches: string; duration: string };
const icons = [Layers3, Camera, Music2, ClipboardCheck, CalendarDays, Vote, Trophy, ShieldCheck, Copyright];

export default function Regolamento() {
  const { t, list } = useI18n();
  const articles = list<Article>('rules.articles');
  const stats = list<Stat>('rules.stats');
  const rounds = list<Round>('rules.rounds');
  return <main className="rules-page"><div className="rules-container">
    <header className="rules-header"><span className="rules-eyebrow">{t('rules.eyebrow')}</span><h1>{t('rules.title')}<span>.</span></h1><p>{t('rules.intro')}</p><Link to="/campionato" className="rules-main-link">{t('rules.bracket')}<ArrowUpRight size={17} /></Link></header>
    <section className="rules-stats" aria-label={t('rules.statsLabel')}>{stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</section>
    <section className="rules-flow" aria-labelledby="rules-flow-title"><div className="rules-section-heading"><span className="rules-eyebrow">{t('rules.flowEyebrow')}</span><h2 id="rules-flow-title">{t('rules.flowTitle')}</h2><p>{t('rules.flowText')}</p></div><div className="rules-rounds">{rounds.map((round, index) => <div key={round.title}><span className="rules-round-number">0{index + 1}</span><h3>{round.title}</h3><strong>{round.participants}</strong><p>{round.matches}<span>{round.duration}</span></p>{index < rounds.length - 1 && <ArrowRight size={18} className="rules-round-arrow" aria-hidden="true" />}</div>)}</div><p className="rules-secret-note"><LockKeyhole size={16} /><span>{t('rules.secretNote')}</span></p></section>
    <div className="rules-document"><aside className="rules-index"><nav aria-label={t('rules.index')}><p>{t('rules.index')}</p>{articles.map((article, index) => <a key={article.title} href={`#articolo-${index + 1}`}><span>{String(index + 1).padStart(2, '0')}</span>{article.title}</a>)}</nav></aside><div className="rules-articles">{articles.map((article, index) => {
      const Icon = icons[index] ?? Layers3;
      return <article id={`articolo-${index + 1}`} key={article.title} className="rules-article"><div className="rules-article-top"><span className="rules-eyebrow">{t('rules.articleLabel')} {String(index + 1).padStart(2, '0')}</span><Icon size={21} strokeWidth={1.5} /></div><h2>{article.title}</h2>{article.intro && <p className="rules-article-intro">{article.intro}</p>}{article.rules && <dl>{article.rules.map(rule => <div key={rule.label}><dt>{rule.label}</dt><dd>{rule.text}</dd></div>)}</dl>}</article>;
    })}</div></div>
    <footer className="rules-footer"><div><span className="rules-eyebrow">UNSEEN</span><h2>{t('rules.ctaTitle')}</h2><p>{t('rules.ctaText')}</p></div><div className="rules-cta-links"><Link to="/submit"><Camera size={16} />{t('rules.sendPhoto')}<ArrowUpRight size={14} /></Link><Link to="/submit?tipo=musica"><Music2 size={16} />{t('rules.sendMusic')}<ArrowUpRight size={14} /></Link></div><p className="rules-acceptance">{t('rules.accepted')}</p></footer>
  </div></main>;
}
