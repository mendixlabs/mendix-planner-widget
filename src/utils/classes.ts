import { withNaming, ClassNameFormatter } from "@bem-react/classname";

export const getClassNames = (rootName: string): ClassNameFormatter =>
    withNaming({ e: "__", m: "--", v: "_" })(rootName);
