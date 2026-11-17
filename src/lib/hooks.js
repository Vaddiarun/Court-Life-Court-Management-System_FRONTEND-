import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "../api/client";
import { useToast } from "../components/ui";

// GET helper: useApi(["cases", filters], "/cases", filters)
export function useApi(key, path, params, options = {}) {
  return useQuery({ queryKey: Array.isArray(key) ? key : [key], queryFn: () => get(path, params), ...options });
}

// Mutation helper with toast + cache invalidation.
export function useAction(fn, { success, invalidate = [], onSuccess, quiet } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      if (success) toast(typeof success === "function" ? success(data, vars) : success);
      onSuccess?.(data, vars);
    },
    onError: (err) => !quiet?.(err) && toast(err.message, "error"),
  });
}

// Members of the current firm, used by many pickers.
export function useMembers(role, options = {}) {
  return useApi(["members", role || "all"], "/firm/users", { role, limit: 200, active: true }, { staleTime: 60_000, ...options });
}

export function useLanguages() {
  return useApi("languages", "/meta/languages", undefined, { staleTime: Infinity });
}
