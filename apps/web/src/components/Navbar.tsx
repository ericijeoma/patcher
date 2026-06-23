import { Link } from '@tanstack/react-router'
import { useTheme } from '../context/ThemeContext'
import { useSession, signOut } from '../lib/auth'
import { Sun, Moon, LogIn, LogOut, User, Settings, Key, History, Home } from 'lucide-react'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { data: session, isPending } = useSession()

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo Matrix - Clickable to go home */}
            <Link to="/" className="flex-shrink-0 flex items-center cursor-pointer">
              {/* Large Logo Light - Tablet/Desktop */}
              <img
                src="/assests/images/large-logo-light.png"
                alt="Hexis Logo"
                className="h-8 w-auto hidden dark:hidden md:block"
              />
              {/* Logo Light - Mobile */}
              <img
                src="/assests/images/logo-light.png"
                alt="Hexis Logo"
                className="h-8 w-auto block md:hidden dark:hidden"
              />
              {/* Large Logo Dark - Tablet/Desktop */}
              <img
                src="/assests/images/large-logo-dark.png"
                alt="Hexis Logo"
                className="h-8 w-auto hidden dark:md:block"
              />
              {/* Logo Dark - Mobile */}
              <img
                src="/assests/images/logo-dark.png"
                alt="Hexis Logo"
                className="h-8 w-auto hidden dark:block dark:md:hidden"
              />
            </Link>

            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Home is registered and completely valid */}
              <Link
                to="/"
                className="border-indigo-500 text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                activeProps={{ className: "border-indigo-500 text-gray-900 dark:text-white" }}
                inactiveProps={{ className: "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-700 dark:hover:text-gray-300" }}
              >
                <Home className="mr-1 h-4 w-4" /> Home
              </Link>
              
              {session && (
                <>
                  {/* FIX: Temporarily using standard <a> elements to bypass strict type-checks */}
                  <Link
                    to="/history"
                    className="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    <History className="mr-1 h-4 w-4" /> History
                  </Link>
                  <Link
                    to="/settings"
                    className="border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    <Settings className="mr-1 h-4 w-4" /> Settings
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* Auth Buttons */}
            {isPending ? (
              <div className="ml-4 px-3 py-1 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            ) : session ? (
              <div className="ml-4 flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <LogOut className="mr-1 h-4 w-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="ml-4 space-x-2">
                {/* FIX: Swapped out unconfigured auth <Link> targets for traditional anchor tags */}
                <Link
                  to="/sign-in"
                  className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-700 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <LogIn className="mr-1 h-4 w-4" /> Sign In
                </Link>
                <Link
                  to="/sign-up"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <User className="mr-1 h-4 w-4" /> Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
