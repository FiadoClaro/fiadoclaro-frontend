"""Genera src/types/api.ts a partir de docs/openapi.json.

Uso: npm run types:api   (equivale a: python -I scripts/gen_api_types.py docs/openapi.json src/types/api.ts)
Reglas: los decimales (number|string en entradas, string en salidas) se tipan como `Decimal` (= string).
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
spec = json.load(open(src, encoding="utf-8"))
schemas = spec["components"]["schemas"]

RENAME = {"Body_login_api_v1_iam_login_post": "LoginForm"}
PAGINA = re.compile(r"^Pagina_(\w+?)_$")


def ts_name(name: str) -> str:
    if name in RENAME:
        return RENAME[name]
    m = PAGINA.match(name)
    if m:
        return f"Pagina{m.group(1)}"
    return name


def ref_name(ref: str) -> str:
    return ts_name(ref.split("/")[-1])


def ts_type(s: dict) -> str:
    if "$ref" in s:
        return ref_name(s["$ref"])
    if "anyOf" in s:
        kinds = [a.get("type") for a in s["anyOf"]]
        # number|string = Decimal enviado como texto
        if set(kinds) >= {"number", "string"}:
            rest = [a for a in s["anyOf"] if a.get("type") not in ("number", "string")]
            return " | ".join(["Decimal"] + [ts_type(a) for a in rest])
        parts = []
        for a in s["anyOf"]:
            t = ts_type(a)
            if t not in parts:
                parts.append(t)
        return " | ".join(parts)
    if "enum" in s:
        return " | ".join(json.dumps(v, ensure_ascii=False) for v in s["enum"])
    if "const" in s:
        return json.dumps(s["const"], ensure_ascii=False)
    t = s.get("type")
    if t == "array":
        inner = ts_type(s.get("items", {}))
        return f"({inner})[]" if "|" in inner else f"{inner}[]"
    if t == "object":
        ap = s.get("additionalProperties")
        if isinstance(ap, dict):
            return f"Record<string, {ts_type(ap)}>"
        return "Record<string, unknown>"
    if t == "integer":
        return "number"
    if t == "number":
        return "Decimal"
    if t == "string":
        fmt = s.get("format")
        return {"date": "IsoDate", "date-time": "IsoDateTime", "time": "IsoTime"}.get(fmt, "string")
    if t == "boolean":
        return "boolean"
    if t == "null":
        return "null"
    return "unknown"


def jsdoc(text: str, indent: str = "") -> str:
    text = " ".join(text.split())
    return f"{indent}/** {text} */\n"


lines = [
    "/**",
    " * Tipos de la API de FiadoClaro, generados desde docs/openapi.json.",
    " * NO editar a mano: si cambia el backend, vuelve a descargar openapi.json y regenera.",
    " *",
    " * Regla del proyecto: montos y tasas llegan como TEXTO (\"108.44\", \"3.5000000\").",
    " * Por eso se tipan como `Decimal` (= string). Nunca convertirlos a number para operar;",
    " * solo formatearlos con utils/format.ts.",
    " */",
    "",
    "/** Número decimal exacto enviado como texto (montos con 2 decimales, tasas con hasta 7). */",
    "export type Decimal = string",
    "/** Fecha ISO `YYYY-MM-DD`. */",
    "export type IsoDate = string",
    "/** Fecha y hora ISO `YYYY-MM-DDTHH:mm:ss±hh:mm`. */",
    "export type IsoDateTime = string",
    "/** Hora ISO `HH:mm:ss`. */",
    "export type IsoTime = string",
    "",
    "/** Roles del sistema. */",
    "export type Rol = 'ADMIN_SISTEMA' | 'ADMIN_TIENDA' | 'CLIENTE'",
    "",
    "/** Respuesta paginada de las listas: `{items, total, limit, offset, conteos?}`. */",
    "export interface Pagina<T> {",
    "  items: T[]",
    "  /** Registros que cumplen los filtros, en todas las páginas */",
    "  total: number",
    "  limit: number",
    "  offset: number",
    "  /** Facetas: cantidad de registros por cada valor de un filtro */",
    "  conteos?: Record<string, Record<string, number>> | null",
    "}",
    "",
    "/** Forma de todos los errores del backend. */",
    "export interface ApiErrorBody {",
    "  /** Mensaje en español (o lista de errores de validación de FastAPI). */",
    "  detail: string | ValidationError[]",
    "  /** Código estable, p. ej. `tasa_supera_tope`, `excede_credito`. */",
    "  code?: string",
    "  errores?: unknown",
    "  datos?: unknown",
    "}",
    "",
]

for name, s in schemas.items():
    m = PAGINA.match(name)
    if m:
        lines.append(f"export type {ts_name(name)} = Pagina<{ts_name(m.group(1))}>")
        lines.append("")
        continue
    if s.get("description"):
        lines.append(jsdoc(s["description"]).rstrip("\n"))
    if s.get("type") != "object" or "properties" not in s:
        lines.append(f"export type {ts_name(name)} = {ts_type(s)}")
        lines.append("")
        continue
    required = set(s.get("required", []))
    lines.append(f"export interface {ts_name(name)} {{")
    for prop, ps in s["properties"].items():
        if ps.get("description"):
            lines.append(jsdoc(ps["description"], "  ").rstrip("\n"))
        opt = "" if prop in required else "?"
        key = prop if re.match(r"^[A-Za-z_$][\w$]*$", prop) else json.dumps(prop)
        lines.append(f"  {key}{opt}: {ts_type(ps)}")
    lines.append("}")
    lines.append("")

open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print(f"{len(schemas)} esquemas -> {out}")
