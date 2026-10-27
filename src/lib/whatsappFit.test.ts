import { test, expect } from "vitest";
import { fitModulesMessage } from "@/lib/whatsappFit";
test("fits", () => {
  const mods = Array.from({length:12},(_,i)=>({id:""+i,course_id:"",title:"Módulo "+i,description:Array.from({length:40},(_,j)=>"Tema longo número "+j).join("; "),workload_hours:30,order_index:i,created_at:""})) as any;
  const t = fitModulesMessage(["HEAD",""], mods, ["FIM 🎯"], (m)=>"▪️ *"+m.title+"*");
  expect(t.length).toBeLessThanOrEqual(4095);
  expect(t.endsWith("FIM 🎯")).toBe(true);
  expect(t).not.toContain("...");
  expect(t).toContain("Módulo 11");
});
