export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  cargo: string;
  doc: string;
  email: string;
  foto?: string | null;
  date_joined?: string;
  ldap?: boolean;
  id_unidad?: number;
  fid_unidad?: number;
  es_mae?: boolean;
}

export interface MenuItem {
  id_menu: number;
  label: string;
  url: string;
  icon: string;
  submenu?: MenuItem[];
}

export interface UserRole {
  fid_rol: number;
  rol: {
    peso: number;
    nombre: string;
  };
}

export interface AuthResponseData {
  user: User;
  menu: MenuItem[];
  menuEntrar: string;
  roles: UserRole[];
}

export interface AuthResponse {
  tipoMensaje: string;
  mensaje: string;
  datos: AuthResponseData;
  token: string;
}
