import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium text-indigo-600">WorkNest</p>

        <h1 className="mt-3 text-7xl font-semibold tracking-tight text-slate-900">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          Page not found
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <Link
          to="/dashboard"
          className="mt-7 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
