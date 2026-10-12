import ApiClient from "../helpers/ApiClient";
import useSWR from "swr";

const fetcher = (url) => ApiClient.get(url).then((res) => res.data);

export function useDashboard(range = "today", from = null, to = null) {
  let APIURL = `/dashboard?range=${range}`;
  if (range === "custom" && from && to) {
    APIURL += `&from=${from}&to=${to}`;
  }
  const { data, error, isLoading, mutate } = useSWR(APIURL, fetcher, {
    revalidateOnFocus: true,
  });
  return {
    data,
    error,
    isLoading,
    mutate,
    APIURL,
  };
}
