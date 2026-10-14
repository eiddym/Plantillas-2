const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('./logger');

/**
 * Sincroniza y crea un usuario en Authentik y lo asigna al grupo correspondiente.
 */
async function sincronizarUsuarioAuthentik(datosUsuario) {
  const username = (datosUsuario.usuario || '').trim();
  const email = (datosUsuario.email || '').trim();
  const nombres = (datosUsuario.nombres || '').trim();
  const apellidos = (datosUsuario.apellidos || '').trim();
  const name = `${nombres} ${apellidos}`.trim() || username;
  const cedula = (datosUsuario.numero_documento || '').trim();
  const cargo = (datosUsuario.cargo || '').trim();

  if (!username || !email) {
    logger.error('[AUTHENTIK_SYNC] Usuario o email no provistos.');
    return false;
  }

  const pythonScript = `
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'authentik.root.settings')
django.setup()

from authentik.core.models import User, Group

username = "${username}"
email = "${email}"
name = "${name.replace(/"/g, '\\"')}"
cedula = "${cedula}"
cargo = "${cargo.replace(/"/g, '\\"')}"

user, created = User.objects.get_or_create(username=username)
user.email = email
user.name = name
user.is_active = True
user.attributes = user.attributes or {}
user.attributes['cedula'] = cedula
user.attributes['cargo'] = cargo
user.save()

group, _ = Group.objects.get_or_create(name='Plantillas Users')
group.users.add(user)

print(f"AUTHENTIK_OK:{user.pk}")
`;

  try {
    const cmd = `docker exec -i $(docker ps -q -f name=authentik-server) python3 - << 'EOF'\n${pythonScript}\nEOF`;
    const { stdout, stderr } = await execPromise(cmd);
    logger.info(`[AUTHENTIK_SYNC] Sincronización exitosa para usuario ${username}`);
    return true;
  } catch (error) {
    logger.error(`[AUTHENTIK_SYNC] Error al sincronizar usuario ${username}: ${error.message}`);
    return false;
  }
}

module.exports = {
  sincronizarUsuarioAuthentik
};
