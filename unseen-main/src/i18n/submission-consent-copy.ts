import type { Locale } from './index';

const it = {
  photo: 'Dichiaro di avere più di 16 anni, di essere autore della fotografia o di avere tutte le autorizzazioni necessarie per inviarla. Confermo di avere il consenso delle persone riconoscibili ritratte.',
  music: 'Dichiaro di avere più di 16 anni, di essere autore del brano e della copertina o di avere tutte le autorizzazioni necessarie per inviarli. Confermo di avere i diritti e i consensi necessari, inclusi quelli relativi a campionamenti e collaborazioni.',
  required: 'Per inviare, conferma di avere più di 16 anni e di disporre dei diritti e dei consensi necessari.',
  termsRequired: 'Per inviare, leggi e accetta i Termini di servizio e l’Informativa privacy.',
  termsAcceptance: 'Dichiaro di aver letto e accettato i Termini di servizio e di aver preso visione dell’Informativa privacy.',
  termsLink: 'Leggi i Termini di servizio e l’Informativa privacy',
};

type Copy = typeof it;

const en: Copy = {
  photo: 'I confirm that I am over 16, created this photograph or have all permissions needed to submit it, and have consent from any identifiable people depicted.',
  music: 'I confirm that I am over 16, created this track and cover or have all permissions needed to submit them, and have the necessary rights and permissions, including for samples and collaborations.',
  required: 'To submit, confirm that you are over 16 and have the necessary rights and permissions.',
  termsRequired: 'To submit, read and accept the Terms of Service and acknowledge the Privacy Notice.',
  termsAcceptance: 'I confirm that I have read and accept the Terms of Service and acknowledge the Privacy Notice.',
  termsLink: 'Read the Terms of Service and Privacy Notice',
};

export const submissionConsentCopy: Record<Locale, Copy> = {
  it,
  en,
  es: {
    photo: 'Declaro que tengo más de 16 años, soy el autor de la fotografía o tengo todos los permisos necesarios para enviarla, y cuento con el consentimiento de las personas reconocibles que aparecen en ella.',
    music: 'Declaro que tengo más de 16 años, soy el autor de la canción y la portada o tengo todos los permisos necesarios para enviarlas, y cuento con los derechos y permisos necesarios, incluidos los relativos a samples y colaboraciones.',
    required: 'Para enviar, confirma que tienes más de 16 años y que dispones de los derechos y permisos necesarios.',
    termsRequired: 'Para enviar, lee y acepta los Términos de servicio y confirma que has leído el Aviso de privacidad.',
    termsAcceptance: 'Declaro que he leído y acepto los Términos de servicio y que he leído el Aviso de privacidad.',
    termsLink: 'Leer los Términos de servicio y el Aviso de privacidad',
  },
  fr: {
    photo: 'Je déclare avoir plus de 16 ans, être l’auteur de la photographie ou disposer des autorisations nécessaires pour l’envoyer, et avoir obtenu le consentement des personnes reconnaissables représentées.',
    music: 'Je déclare avoir plus de 16 ans, être l’auteur du morceau et de la pochette ou disposer des autorisations nécessaires pour les envoyer, et détenir les droits nécessaires, y compris pour les échantillons et collaborations.',
    required: 'Pour envoyer votre contribution, confirmez avoir plus de 16 ans et disposer des droits et autorisations nécessaires.',
    termsRequired: 'Pour envoyer votre contribution, lisez et acceptez les Conditions de service et prenez connaissance de la Politique de confidentialité.',
    termsAcceptance: 'Je confirme avoir lu et accepter les Conditions de service et avoir pris connaissance de la Politique de confidentialité.',
    termsLink: 'Lire les Conditions de service et la Politique de confidentialité',
  },
  de: {
    photo: 'Ich erkläre, dass ich über 16 Jahre alt bin, das Foto selbst erstellt habe oder alle erforderlichen Genehmigungen besitze und dass erkennbare abgebildete Personen zugestimmt haben.',
    music: 'Ich erkläre, dass ich über 16 Jahre alt bin, den Track und das Cover selbst erstellt habe oder alle erforderlichen Genehmigungen besitze und die nötigen Rechte, auch für Samples und Kooperationen, habe.',
    required: 'Bestätige für die Einreichung, dass du über 16 Jahre alt bist und die erforderlichen Rechte und Genehmigungen besitzt.',
    termsRequired: 'Lies und akzeptiere für die Einreichung die Nutzungsbedingungen und bestätige, dass du die Datenschutzhinweise zur Kenntnis genommen hast.',
    termsAcceptance: 'Ich bestätige, die Nutzungsbedingungen gelesen zu haben und zu akzeptieren sowie die Datenschutzhinweise zur Kenntnis genommen zu haben.',
    termsLink: 'Nutzungsbedingungen und Datenschutzhinweise lesen',
  },
};
