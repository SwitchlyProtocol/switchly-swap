import { useEffect, useState } from "react";

const apiUrl = import.meta.env.VITE_SWITCHLY_SERVICE_HTTP;

function useNetworkInfo() {
  const [status, setStatus] = useState({status: "", tokens: []});

  useEffect(() => {
    // const url = "./mock-response.json";
    const url = `${apiUrl}/status`;

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        const json = await response.json();
        console.log(json);
        setStatus(json);
      } catch (error) {
        console.log("error", error);
      }
    };

    fetchData();
  }, []);

  return status;
}

export default useNetworkInfo;
