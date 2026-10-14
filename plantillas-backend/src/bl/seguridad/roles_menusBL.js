/**
 * Archivo pra la lógica de negocio para roles_menus
 * - relacionar permisos de menús y acciones
 */

module.exports = {
  /**
   * Función que relaciona permisos (ver, crear, modificar y eliminar) a un
   * rol
   * @param  {Array} menus       Array de objetos de tipo menus
   * @param  {Array} roles_menus Array de objetos de tipo roles_menus
   * @return {Promise<Array>}    Array de objetos de tipo menus con permisos
   */
  establecerMenusPermisos: (menus, roles_menus) => {
    for (let i = 0; i < menus.length; i++) {
      const menu = menus[i];
      if (menu.submenu && menu.submenu.length > 0) {
        const submenus = menu.submenu;
        for (let j = 0; j < submenus.length; j++) {
          const submenu = submenus[j];
          for (let k = 0; k < roles_menus.length; k++) {
            if (submenu.id_menu == roles_menus[k].fid_menu) {
              if (roles_menus[k].method_get)
                menus[i].submenu[j].dataValues.get = true;
              if (roles_menus[k].method_post)
                menus[i].submenu[j].dataValues.post = true;
              if (roles_menus[k].method_put)
                menus[i].submenu[j].dataValues.put = true;
              if (roles_menus[k].method_delete)
                menus[i].submenu[j].dataValues.delete = true;
            }
          }
        }
      }
    }
    return Promise.resolve(menus);
  },

  /**
   * [function description]
   * @param  {Object} rol_menu Objeto rol_menu
   * @param  {Object} menus Objeto menu
   * @return {Object} rol_menu Objeto rol_menu
   */
  crearMenusPermisos: (rol_menu, menus) => {
    let menu = false;
    if(menus.hasOwnProperty('get') && menus.get){
      rol_menu.method_get = true;
      menu = true;
    }
    if(menus.hasOwnProperty('post') && menus.post){
      rol_menu.method_post = true;
      menu = true;
    }
    if(menus.hasOwnProperty('put') && menus.put){
      rol_menu.method_put = true;
      menu = true;
    }
    if(menus.hasOwnProperty('delete') && menus.delete){
      rol_menu.method_delete = true;
      menu = true;
    }
    if(menu){
      return rol_menu;
    }else{
      return null;
    }
  },

};
