import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Dominios conocidos de correo temporal / desechable (disposable emails)
 */
export const DOMINIOS_TEMPORALES_LIST = new Set([
  'mailinator.com', 'yopmail.com', 'yopmail.net', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'tempmail.com', 'temp-mail.org', 'tempmailo.com', '10minutemail.com', '10minutemail.net',
  'guerrillamail.com', 'guerrillamailblock.com', 'sharklasers.com', 'grr.la', 'guerrillamail.info',
  'dispostable.com', 'trashmail.com', 'trashmail.net', 'trashmail.me', 'maildrop.cc',
  'fakeinbox.com', 'mohmal.com', 'burnermail.io', 'emailondeck.com', 'getairmail.com',
  'throwawaymail.com', 'mytemp.email', 'generator.email', 'crazymailing.com', 'inboxkitten.com',
  'nada.ltd', 'getnada.com', 'abv.bg', 'dropmail.me', 'fakemailgenerator.com',
  'tempinbox.com', 'crazymail.com', 'mailcatch.com', 'trash-mail.com', 'trashmail.at'
]);

/**
 * Validador para Nombres Reales:
 * - Rechaza abreviaturas o títulos por delante (Lic., Ing., Dr., Arq., etc.)
 * - Solo caracteres alfabéticos, tildes y espacios
 * - Requiere al menos dos palabras (nombres y apellidos)
 */
export function nombreRealValidator(): ValidatorFn {
  const TITULOS_REGEX = /^(lic|licda|licdo|ing|inga|dr|dra|doc|abg|abog|abogado|abogada|arq|prof|profa|msc|mgr|mgtr|master|magister|phd|ph\.d|sr|sra|srta|don|doña|tec|téc|tecnico|tecnica|técnico|técnica|gral|cnel|tte|cap)(\.|\s|$)/i;
  const SOLO_LETRAS_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;

  return (control: AbstractControl): ValidationErrors | null => {
    const val = (control.value || '').trim();
    if (!val) return null; // Los validadores requeridos se encargan si está vacío

    if (TITULOS_REGEX.test(val)) {
      return {
        tituloNoPermitido: true,
        mensaje: 'No incluya títulos ni abreviaciones (como Lic., Ing., Dr., etc.). Ingrese únicamente sus nombres y apellidos reales.'
      };
    }

    if (!SOLO_LETRAS_REGEX.test(val)) {
      return {
        caracteresInvalidos: true,
        mensaje: 'El nombre solo debe contener letras del alfabeto y espacios (sin números ni símbolos).'
      };
    }

    const palabras = val.split(/\s+/).filter((p: string) => p.length >= 2);
    if (palabras.length < 2) {
      return {
        nombreIncompleto: true,
        mensaje: 'Debe ingresar nombres y apellidos completos (al menos dos palabras).'
      };
    }

    return null;
  };
}

/**
 * Validador Estricto de Correo Electrónico:
 * - Formato estándar usuario@dominio.tld
 * - Rechaza dominios temporales / desechables (Mailinator, Yopmail, etc.)
 * - Rechaza correos numéricos falsos como 123@123.com o secuencias repetidas
 */
export function correoEstrictoValidator(): ValidatorFn {
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const USUARIOS_FALSOS = new Set(['123', '1234', '12345', '111', '000', 'test', 'prueba', 'fake', 'ejemplo', 'asd', 'asdf', 'qwerty']);

  return (control: AbstractControl): ValidationErrors | null => {
    const val = (control.value || '').trim().toLowerCase();
    if (!val) return null;

    if (!EMAIL_REGEX.test(val)) {
      return {
        correoInvalido: true,
        mensaje: 'Formato de correo electrónico no válido.'
      };
    }

    const partes = val.split('@');
    if (partes.length !== 2) return { correoInvalido: true };

    const usuario = partes[0];
    const dominioCompleto = partes[1];
    const partesDominio = dominioCompleto.split('.');
    const dominioBase = partesDominio[0];

    // 1. Dominio temporal / descartable
    if (DOMINIOS_TEMPORALES_LIST.has(dominioCompleto)) {
      return {
        correoTemporal: true,
        mensaje: `No se permiten correos temporales o desechables (@${dominioCompleto}). Ingrese un correo corporativo o personal permanente.`
      };
    }

    // 2. Dominio puramente numérico (ej: 123.com)
    if (/^[0-9]+$/.test(dominioBase)) {
      return {
        correoFalso: true,
        mensaje: 'El dominio del correo no puede ser numérico (ej: 123.com). Ingrese un correo real verificable.'
      };
    }

    // 3. Patrones ficticios obvios
    if (USUARIOS_FALSOS.has(usuario) && (USUARIOS_FALSOS.has(dominioBase) || usuario === dominioBase)) {
      return {
        correoFalso: true,
        mensaje: 'El correo ingresado no es una dirección real. Ingrese un correo verificable para recibir su Hoja de Ruta.'
      };
    }

    return null;
  };
}
