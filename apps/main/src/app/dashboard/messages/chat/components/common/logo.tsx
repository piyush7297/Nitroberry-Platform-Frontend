"use client";

export const Logo = ({
  variant = "header",
  className = "",
}: {
  variant?: "login" | "header";
  className?: string;
}) => {
  const isHeader = variant === "header";

  return (
    <div
      className={`flex items-center justify-center transition-all duration-300 ${className} ${
        isHeader ? "flex-col gap-0" : "flex-col gap-4 w-full text-center"
      }`}
    >
      <div
        className={`bg-[#7f56d9] flex items-center justify-center transition-all duration-500 hover:rotate-12 hover:scale-110 ${
          isHeader
            ? "w-10 h-10 rounded-xl shadow-[0_4px_12px_rgba(127,86,217,0.3)]"
            : "w-20 h-20 rounded-4xl shadow-[0_0_40px_rgba(127,86,217,0.4)]"
        }`}
      >
        <svg
          className={`${isHeader ? "w-6 h-6" : "w-10 h-10"} text-white`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>

      {!isHeader ? (
        <div className="flex flex-col items-center mt-4">
          <h1 className="font-black tracking-tighter uppercase leading-none text-3xl text-[rgb(var(--app-text))]">
            Nitroberry
          </h1>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[rgb(var(--app-accent))] mt-2">
            System Interface
          </span>
        </div>
      ) : (
        <span className="text-[8px] font-black uppercase tracking-tighter opacity-20 mt-2 lg:hidden">
          NB
        </span>
      )}
    </div>
  );
};
