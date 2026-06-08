import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Users, School, Database, LogOut, Menu, X, GraduationCap, ChevronDown, BookOpen, BookText, Grid2x2 as Grid, ChevronLeft, ChevronRight, Baby, Monitor, Key, Mail } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Schools', href: '/schools', icon: School },
  {
    name: 'Didactiek',
    icon: BookOpen,
    submenu: [
      { name: 'Nieuwsbrieven', href: '/didactiek/nieuwsbrieven' },
      { name: 'Vormingen', href: '/didactiek/vormingen' },
      { name: 'FAQ', href: '/didactiek/faq' },
      { name: 'Technieken', href: '/didactiek/technieken' }
    ]
  },
  {
    name: 'Woordenschat',
    icon: BookText,
    submenu: [
      { name: 'Klankteken', href: '/woordenschat/klankteken' },
      { name: 'Woordenschat', href: '/woordenschat/woorden' },
      { name: 'Nieuwe Woorden', href: '/woordenschat/nieuwe-woorden' },
      { name: 'Snelle Review', href: '/woordenschat/snelle-review' },
      { name: 'Lidwoorden', href: '/woordenschat/lidwoorden' },
      { name: 'Check Klankteken', href: '/woordenschat/check-klankteken' },
      { name: 'Check Betekenis', href: '/woordenschat/check-betekenis' },
      { name: 'Klankgroepen', href: '/woordenschat/klankgroepen' },
      { name: 'Check Klankgroepen', href: '/woordenschat/check-klankgroepen' },
      { name: 'Analyse Klankgroepen', href: '/woordenschat/analyse-klankgroepen' },
      { name: 'Statistiek', href: '/woordenschat/statistiek' },
      { name: 'Analyse', href: '/woordenschat/analyse' },
      { name: 'Foneem Frequentie', href: '/woordenschat/foneem-frequentie' },
      { name: 'Missing Images', href: '/woordenschat/missing-images' },
      { name: 'Genereer Afbeeldingen', href: '/woordenschat/genereer-afbeeldingen' },
      { name: 'Betekenis Genereren', href: '/woordenschat/betekenis-genereren' },
      { name: 'Woordstructuur', href: '/woordenschat/woordstructuur' },
      { name: 'Oefentypes', href: '/woordenschat/oefentypes' },
      { name: 'Kinderwoorden', href: '/woordenschat/kinderwoorden' },
      { name: 'Klankzuiver Check', href: '/woordenschat/klankzuiver-check' }
    ]
  },
  {
    name: 'Apps',
    icon: Grid,
    submenu: [
      { name: 'DigiTools', href: '/apps/digitools' },
      { name: 'Activi-tijd', href: '/apps/activi-tijd' },
      { name: 'Executieve Functies', href: '/apps/executieve-functies' },
      { name: 'Gedragskaarten', href: '/apps/gedragskaarten' },
      { name: 'LetterLezer', href: '/apps/letterlezer' }
    ]
  },
  {
    name: 'Kleuterdidactiek',
    icon: Baby,
    submenu: [
      { name: 'Leerdoelen', href: '/kleuterdidactiek/leerdoelen' },
      { name: 'Kijk', href: '/kleuterdidactiek/videos' },
      { name: 'Schrijf', href: '/kleuterdidactiek/schrijf' },
      { name: 'Doe', href: '/kleuterdidactiek/doe' },
      { name: 'Speel', href: '/kleuterdidactiek/speel' },
      { name: 'Woordenschat', href: '/kleuterdidactiek/woordenschat' },
      { name: 'Afbeeldingen', href: '/kleuterdidactiek/afbeeldingen' }
    ]
  },
  {
    name: 'Platform',
    icon: Monitor,
    submenu: [
      { name: 'Demo', href: '/platform/demo' },
      { name: 'Contact Messages', href: '/platform/contact-messages', badgeKey: 'contactNew' },
      { name: 'Bug Reports', href: '/platform/bug-reports', badgeKey: 'bugNew' },
      { name: 'Emergency Broadcast', href: '/platform/emergency-broadcast' },
      { name: 'Feature Analytics', href: '/platform/analytics' },
      { name: 'Begeleiding', href: '/platform/begeleiding', badgeKey: 'begeleidingNew' }
    ]
  },
  {
    name: 'Licensing',
    icon: Key,
    submenu: [
      { name: 'Overview', href: '/licensing/overview' },
      { name: 'Vouchers', href: '/licensing/vouchers' },
      { name: 'Manual Grants', href: '/licensing/manual-grants' },
      { name: 'Reports', href: '/licensing/reports' },
      { name: 'Products', href: '/licensing/products' }
    ]
  },
  { name: 'Tables', href: '/tables', icon: Database },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [badges, setBadges] = useState<Record<string, number>>({ contactNew: 0, bugNew: 0, begeleidingNew: 0 });
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBadgeCounts();
  }, [location.pathname]);

  const fetchBadgeCounts = async () => {
    const [{ count: contactCount }, { count: bugCount }, { count: begeleidingCount }] = await Promise.all([
      supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('begeleiding_requests').select('*', { count: 'exact', head: true }).eq('status', 'nieuw'),
    ]);
    setBadges({ contactNew: contactCount || 0, bugNew: bugCount || 0, begeleidingNew: begeleidingCount || 0 });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavBadge = ({ count }: { count: number }) => {
    if (!count) return null;
    return (
      <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center leading-none">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full">
          <div className={`flex items-center gap-3 py-5 border-b border-gray-200 ${sidebarCollapsed ? 'px-4 justify-center' : 'px-6'}`}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-gray-900">Bijleer.school</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              if ('submenu' in item && item.submenu) {
                const isDropdownOpen = openDropdown === item.name && !sidebarCollapsed;
                const isActiveSection = item.submenu.some(sub => location.pathname === sub.href);
                // Total badge count for this section
                const sectionBadgeCount = item.submenu.reduce((sum, sub) => {
                  if ('badgeKey' in sub && sub.badgeKey) return sum + (badges[sub.badgeKey] || 0);
                  return sum;
                }, 0);

                if (sidebarCollapsed) {
                  return (
                    <div key={item.name} className="relative group">
                      <button
                        onClick={(e) => {
                          setOpenDropdown(openDropdown === item.name ? null : item.name);
                          const rect = e.currentTarget.getBoundingClientRect();
                          e.currentTarget.dataset.top = String(rect.top);
                          e.currentTarget.dataset.left = String(rect.right + 8);
                        }}
                        className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors relative ${
                          isActiveSection
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        title={item.name}
                      >
                        <item.icon className="w-5 h-5" />
                        {sectionBadgeCount > 0 && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {sectionBadgeCount > 9 ? '9+' : sectionBadgeCount}
                          </span>
                        )}
                      </button>
                      {openDropdown === item.name && (() => {
                        const button = document.querySelector(`[title="${item.name}"]`) as HTMLElement;
                        const top = button?.dataset.top || '0';
                        const left = button?.dataset.left || '0';
                        return (
                          <>
                            <div
                              className="fixed inset-0 z-[200]"
                              onClick={() => setOpenDropdown(null)}
                            />
                            <div
                              className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[300]"
                              style={{ top: `${top}px`, left: `${left}px` }}
                            >
                              <div className="px-4 py-2 border-b border-gray-200">
                                <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                              </div>
                              <div className="py-1">
                                {item.submenu.map((subItem) => {
                                  const isActive = location.pathname === subItem.href;
                                  const badgeCount = 'badgeKey' in subItem && subItem.badgeKey ? badges[subItem.badgeKey] || 0 : 0;
                                  return (
                                    <Link
                                      key={subItem.name}
                                      to={subItem.href}
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        setSidebarOpen(false);
                                      }}
                                      className={`flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                                        isActive
                                          ? 'bg-blue-50 text-blue-700 font-medium'
                                          : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <span>{subItem.name}</span>
                                      {badgeCount > 0 && <NavBadge count={badgeCount} />}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  );
                }

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setOpenDropdown(isDropdownOpen ? null : item.name)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActiveSection
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isDropdownOpen && sectionBadgeCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                            {sectionBadgeCount > 99 ? '99+' : sectionBadgeCount}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isDropdownOpen && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.submenu.map((subItem) => {
                          const isActive = location.pathname === subItem.href;
                          const badgeCount = 'badgeKey' in subItem && subItem.badgeKey ? badges[subItem.badgeKey] || 0 : 0;
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <span>{subItem.name}</span>
                              {badgeCount > 0 && <NavBadge count={badgeCount} />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = location.pathname === item.href;

              if (sidebarCollapsed) {
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={item.name}
                  >
                    <item.icon className="w-5 h-5" />
                  </Link>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 space-y-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex w-full items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Collapse</span>
                </>
              )}
            </button>

            {sidebarCollapsed ? (
              <>
                <div className="flex items-center justify-center py-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user?.email?.[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center p-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user?.email?.[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-500">Administrator</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-30 p-3 bg-white text-gray-600 hover:bg-gray-100 rounded-lg shadow-lg lg:hidden"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
