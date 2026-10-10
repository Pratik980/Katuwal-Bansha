import { HeartIcon } from "@heroicons/react/24/solid";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex flex-col items-center justify-between gap-3 px-6 py-4 text-sm text-gray-600 md:flex-row">

        <div>
          © {year} <span className="font-semibold text-green-600">Katuwal Bansha Batika</span>.
          All Rights Reserved.
        </div>

        <div className="flex items-center gap-2">
          <span>Powered by</span>

          <span className="font-semibold text-green-600">
            NDS Software
          </span>

          <HeartIcon className="h-4 w-4 text-red-500" />
        </div>

      </div>
    </footer>
  );
}