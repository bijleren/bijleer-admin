import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Save, SkipForward, Volume2, Trash2, RefreshCw } from 'lucide-react';

interface Word {
  id: number;
  word: string;
  klankteken: string | null;
  opmerking: string | null;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

interface PhonemeAsset {
  klinktAls: string;
  letters: string;
  audio: string;
  audio_uitleg: string;
  tool_uitleg: string;
  articulation: string;
  type: string;
  tool: string;
  blockRepresentation: string;
  imageWord: string;
  imageTool: string;
}

const phonemeAssets: { [key: string]: PhonemeAsset } = {
  "doffe": { klinktAls:"e", letters:"e", audio: "https://www.instructielezen.be/fonetics/doffe.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/doffe_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/doffe_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/doffe.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/doffe_tool.png", blockRepresentation: "V", imageWord: "tand<b><u>e</u></b>n", imageTool: "vlind<b><u>e</u></b>r" },
  "aa": { klinktAls:"aa", letters:"aa", audio:  "https://www.instructielezen.be/fonetics/aa.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/aa_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/aa_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/aa.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/aa_tool.png", blockRepresentation: "--", imageWord: "h<b><u>aa</u></b>r", imageTool: "<b><u>aa</u></b>p" },
  "a": { klinktAls:"a", letters:"a", audio: "https://www.instructielezen.be/fonetics/a.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/a_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/a_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/a.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/a_tool.png", blockRepresentation: "-", imageWord: "<b><u>a</u></b>rm", imageTool: "k<b><u>a</u></b>t" },
  "bb": { klinktAls:"b", letters:"bb", audio: "https://www.instructielezen.be/fonetics/b.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/b_tool_uitleg.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/b_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/b.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/b_tool.png", blockRepresentation: "C", imageWord: "<b><u>b</u></b>een", imageTool: "<b><u>b</u></b>eer" },
  "b": { klinktAls:"b", letters:"b", audio: "https://www.instructielezen.be/fonetics/b.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/b_tool_uitleg.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/b_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/b.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/b_tool.png", blockRepresentation: "C", imageWord: "<b><u>b</u></b>een", imageTool: "<b><u>b</u></b>eer" },
  "dd": { klinktAls:"d", letters:"dd", audio: "https://www.instructielezen.be/fonetics/d.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/d_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/d_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/d.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/d_tool.png", blockRepresentation: "C", imageWord: "<b><u>d</u></b>uim", imageTool: "<b><u>d</u></b>uif" },
  "d": { klinktAls:"d", letters:"d", audio: "https://www.instructielezen.be/fonetics/d.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/d_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/d_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/d.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/d_tool.png", blockRepresentation: "C", imageWord: "<b><u>d</u></b>uim", imageTool: "<b><u>d</u></b>uif" },
  "ee": { klinktAls:"ee", letters:"ee", audio: "https://www.instructielezen.be/fonetics/ee.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ee_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ee_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ee.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ee_tool.png", blockRepresentation: "--", imageWord: "b<b><u>ee</u></b>n", imageTool: "b<b><u>ee</u></b>r" },
  "e": { klinktAls:"e", letters:"e", audio: "https://www.instructielezen.be/fonetics/e.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/e_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/e_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/e.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/e_tool.png", blockRepresentation: "-", imageWord: "n<b><u>e</u></b>k", imageTool: "fr<b><u>e</u></b>t" },
  "eu": { klinktAls:"eu", letters:"eu", audio: "https://www.instructielezen.be/fonetics/eu.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/eu_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/eu_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/eu.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/eu_tool.png", blockRepresentation: "2", imageWord: "n<b><u>eu</u></b>s", imageTool: "n<b><u>eu</u></b>shoorn" },
  "ff": { klinktAls:"f", letters:"ff", audio: "https://www.instructielezen.be/fonetics/f.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/f_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/f_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/f.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/f_tool.png", blockRepresentation: "C", imageWord: "<b><u>f</u></b>luit", imageTool: "<b><u>f</u></b>lamingo" },
  "f": { klinktAls:"f",letters:"f", audio: "https://www.instructielezen.be/fonetics/f.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/f_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/f_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/f.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/f_tool.png", blockRepresentation: "C", imageWord: "<b><u>f</u></b>luit", imageTool: "<b><u>f</u></b>lamingo" },
  "gg": { klinktAls:"g", letters:"gg", audio: "https://www.instructielezen.be/fonetics/g.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/g_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/g_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/g.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/g_tool.png", blockRepresentation: "C", imageWord: "<b><u>g</u></b>ezicht", imageTool: "<b><u>g</u></b>iraf" },
  "g": { klinktAls:"g", letters:"g", audio: "https://www.instructielezen.be/fonetics/g.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/g_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/g_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/g.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/g_tool.png", blockRepresentation: "C", imageWord: "<b><u>g</u></b>ezicht", imageTool: "<b><u>g</u></b>iraf" },
  "hh": { klinktAls:"h", letters:"hh", audio: "https://www.instructielezen.be/fonetics/h.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/h_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/h_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/h.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/h_tool.png", blockRepresentation: "C", imageWord: "<b><u>h</u></b>aar", imageTool: "<b><u>h</u></b>aan" },
  "h": { klinktAls:"h", letters:"h", audio: "https://www.instructielezen.be/fonetics/h.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/h_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/h_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/h.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/h_tool.png", blockRepresentation: "C", imageWord: "<b><u>h</u></b>aar", imageTool: "<b><u>h</u></b>aan" },
  "i": { klinktAls:"i", letters:"i", audio: "https://www.instructielezen.be/fonetics/i.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/i_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/i_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/i.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/i_tool.png", blockRepresentation: "-", imageWord: "k<b><u>i</u></b>n", imageTool: "k<b><u>i</u></b>p" },
  "j": { klinktAls:"j", letters:"j", audio: "https://www.instructielezen.be/fonetics/j.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/j_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/j_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/j.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/j_tool.png", blockRepresentation: "C", imageWord: "<b><u>j</u></b>euk", imageTool: "<b><u>j</u></b>aguar" },
  "k": { klinktAls:"k", letters:"k", audio: "https://www.instructielezen.be/fonetics/k.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/k_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/k_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/k.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/k_tool.png", blockRepresentation: "C", imageWord: "<b><u>k</u></b>in", imageTool: "<b><u>k</u></b>oe" },
  "kk": { klinktAls:"k", letters:"kk", audio: "https://www.instructielezen.be/fonetics/k.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/k_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/k_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/k.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/k_tool.png", blockRepresentation: "C", imageWord: "<b><u>k</u></b>in", imageTool: "<b><u>k</u></b>oe" },
  "ll": { klinktAls:"l", letters:"ll", audio: "https://www.instructielezen.be/fonetics/l.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/l_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/l_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/l.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/l_tool.png", blockRepresentation: "C", imageWord: "<b><u>l</u></b>ip", imageTool: "<b><u>l</u></b>eeuw" },
  "l": { klinktAls:"l", letters:"l", audio: "https://www.instructielezen.be/fonetics/l.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/l_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/l_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/l.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/l_tool.png", blockRepresentation: "C", imageWord: "<b><u>l</u></b>ip", imageTool: "<b><u>l</u></b>eeuw" },
  "mm": { klinktAls:"m", letters:"mm", audio: "https://www.instructielezen.be/fonetics/m.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/m_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/m_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/m.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/m_tool.png", blockRepresentation: "C", imageWord: "<b><u>m</u></b>ond", imageTool: "<b><u>m</u></b>uis" },
  "m": { klinktAls:"m", letters:"m", audio: "https://www.instructielezen.be/fonetics/m.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/m_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/m_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/m.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/m_tool.png", blockRepresentation: "C", imageWord: "<b><u>m</u></b>ond", imageTool: "<b><u>m</u></b>uis" },
  "nn": { klinktAls:"n", letters:"nn", audio: "https://www.instructielezen.be/fonetics/n.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/n_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/n_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/n.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/n_tool.png", blockRepresentation: "C", imageWord: "<b><u>n</u></b>ek", imageTool: "<b><u>n</u></b>eushoorn" },
  "n": { klinktAls:"n", letters:"n", audio: "https://www.instructielezen.be/fonetics/n.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/n_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/n_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/n.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/n_tool.png", blockRepresentation: "C", imageWord: "<b><u>n</u></b>eus", imageTool: "<b><u>n</u></b>eushoorn" },
  "o": { klinktAls:"o",letters:"o", audio: "https://www.instructielezen.be/fonetics/o.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/o_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/o_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/o.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/o_tool.png", blockRepresentation: "-", imageWord: "m<b><u>o</u></b>nd", imageTool: "h<b><u>o</u></b>nd" },
  "pp": { klinktAls:"p", letters:"pp", audio: "https://www.instructielezen.be/fonetics/p.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/p_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/p_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/p.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/p_tool.png", blockRepresentation: "C", imageWord: "<b><u>p</u></b>ink", imageTool: "<b><u>p</u></b>anda" },
  "p": { klinktAls:"p", letters:"p", audio: "https://www.instructielezen.be/fonetics/p.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/p_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/p_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/p.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/p_tool.png", blockRepresentation: "C", imageWord: "<b><u>p</u></b>ink", imageTool: "<b><u>p</u></b>anda" },
  "oo": { klinktAls:"oo", letters:"oo", audio: "https://www.instructielezen.be/fonetics/oo.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/oo_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/oo_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/oo.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/oo_tool.png", blockRepresentation: "--", imageWord: "<b><u>oo</u></b>r", imageTool: "v<b><u>o</u></b>gel" },
  "oe": { klinktAls:"oe", letters:"oe", audio: "https://www.instructielezen.be/fonetics/oe.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/oe_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/oe_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/oe.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/oe_tool.png", blockRepresentation: "2", imageWord: "v<b><u>oe</u></b>t", imageTool: "p<b><u>oe</u></b>s" },
  "rr": { klinktAls:"r",letters:"rr", audio: "https://www.instructielezen.be/fonetics/r.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/r_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/r_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/r.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/r_tool.png", blockRepresentation: "C", imageWord: "<b><u>r</u></b>ug", imageTool: "<b><u>r</u></b>ups" },
  "r": { klinktAls:"r", letters:"r", audio: "https://www.instructielezen.be/fonetics/r.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/r_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/r_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/r.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/r_tool.png", blockRepresentation: "C", imageWord: "<b><u>r</u></b>ug", imageTool: "<b><u>r</u></b>ups" },
  "ss": { klinktAls:"s", letters:"ss", audio: "https://www.instructielezen.be/fonetics/s.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/s_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/s_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/s.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/s_tool.png", blockRepresentation: "C", imageWord: "<b><u>s</u></b>chouder", imageTool: "<b><u>s</u></b>lang" },
  "s": { klinktAls:"s", letters:"s", audio: "https://www.instructielezen.be/fonetics/s.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/s_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/s_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/s.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/s_tool.png", blockRepresentation: "C", imageWord: "<b><u>s</u></b>chouder", imageTool: "<b><u>s</u></b>lang" },
  "tt": { klinktAls:"t", letters:"tt", audio: "https://www.instructielezen.be/fonetics/t.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/t_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/t_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/t.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/t_tool.png", blockRepresentation: "C", imageWord: "<b><u>t</u></b>een", imageTool: "<b><u>t</u></b>ijger" },
  "t": { klinktAls:"t", letters:"t", audio: "https://www.instructielezen.be/fonetics/t.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/t_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/t_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/t.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/t_tool.png", blockRepresentation: "C", imageWord: "<b><u>t</u></b>een", imageTool: "<b><u>t</u></b>ijger" },
  "u": { klinktAls:"u", letters:"u", audio: "https://www.instructielezen.be/fonetics/u.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/u_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/u_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/u.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/u_tool.png", blockRepresentation: "-", imageWord: "r<b><u>u</u></b>g", imageTool: "m<b><u>u</u></b>g" },
  "ui": { klinktAls:"ui", letters:"ui", audio: "https://www.instructielezen.be/fonetics/ui.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ui_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ui_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ui.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ui_tool.png", blockRepresentation: "2", imageWord: "b<b><u>ui</u></b>k", imageTool: "m<b><u>ui</u></b>s" },
  "uu": { klinktAls:"uu", letters:"uu", audio: "https://www.instructielezen.be/fonetics/uu.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/uu_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/uu_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/uu.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/uu_tool.png", blockRepresentation: "--", imageWord: "z<b><u>uu</u></b>r", imageTool: "f<b><u>uu</u></b>t" },
  "v": { klinktAls:"v", letters:"v", audio: "https://www.instructielezen.be/fonetics/v.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/v_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/v_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/v.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/v_tool.png", blockRepresentation: "C", imageWord: "<b><u>v</u></b>inger", imageTool: "<b><u>v</u></b>os" },
  "z": { klinktAls:"z", letters:"z", audio: "https://www.instructielezen.be/fonetics/z.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/z_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/z_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/z.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/z_tool.png", blockRepresentation: "C", imageWord: "<b><u>z</u></b>ool", imageTool: "<b><u>z</u></b>ebra" },
  "w": { klinktAls:"w", letters:"w", audio: "https://www.instructielezen.be/fonetics/w.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/w_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/w_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/w.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/w_tool.png", blockRepresentation: "C", imageWord: "<b><u>w</u></b>ang", imageTool: "<b><u>w</u></b>alvis" },
  "ng": { klinktAls:"ng", letters:"ng", audio: "https://www.instructielezen.be/fonetics/ng.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ng_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ng_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ng.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/ng_tool.png", blockRepresentation: "C", imageWord: "to<b><u>ng</u></b>", imageTool: "ri<b><u>ng</u></b>worm" },
  "nk": { klinktAls:"nk", letters:"nk", audio: "https://www.instructielezen.be/fonetics/nk.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/nk_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/nk_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/nk.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/nk_tool.png", blockRepresentation: "C", imageWord: "pi<b><u>nk</u></b>", imageTool: "spri<b><u>nk</u></b>haan" },
  "ij": { klinktAls:"ij",letters:"ij", audio: "https://www.instructielezen.be/fonetics/ij.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ij_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ij_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ij.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ij_tool.png", blockRepresentation: "2", imageWord: "d<b><u>ij</u></b>", imageTool: "b<b><u>ij</u></b>" },
  "oei": { klinktAls:"oej", letters:"oei", audio: "https://www.instructielezen.be/fonetics/oei.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/oei_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/oei_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/oei.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/leeg.png", blockRepresentation: "3", imageWord: "gr<b><u>oei</u></b>", imageTool: "" },
  "eeu": { klinktAls:"eew",letters:"eeu", audio: "https://www.instructielezen.be/fonetics/eeu.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/eeu_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/eeu_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/eeu.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/eeu_tool.png", blockRepresentation: "3", imageWord: "g<b><u>eeu</u></b>w", imageTool: "l<b><u>eeu</u></b>w" },
  "ieu": { klinktAls:"iew",letters:"ieu", audio: "https://www.instructielezen.be/fonetics/ieu.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ieu_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ieu_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ieu.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/leeg.png", blockRepresentation: "3", imageWord: "n<b><u>ieu</u></b>w", imageTool: "vlind<b><u>e</u></b>r" },
  "ooi": { klinktAls:"ooj", letters:"ooi", audio: "https://www.instructielezen.be/fonetics/ooi.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ooi_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ooi_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ooi.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ooi_tool.png", blockRepresentation: "3", imageWord: "m<b><u>ooi</u></b>", imageTool: "<b><u>ooi</u></b>evaar" },
  "aai": { klinktAls:"aaj",letters:"aai", audio: "https://www.instructielezen.be/fonetics/aai.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/aai_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/aai_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/aai.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/aai_tool.png", blockRepresentation: "3", imageWord: "s<b><u>aai</u></b>", imageTool: "h<b><u>aai</u></b>"},
  "ie": { klinktAls:"ie",letters:"ie", audio: "https://www.instructielezen.be/fonetics/ie.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ie_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ie_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ie.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ie_tool.png", blockRepresentation: "2", imageWord: "kn<b><u>ie</u></b>", imageTool: "st<b><u>ie</u></b>r" },
  "iealsi": { klinktAls:"ie",letters:"i", audio: "https://www.instructielezen.be/fonetics/ie.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ie_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ie_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ie.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ie_tool.png", blockRepresentation: "2", imageWord: "kn<b><u>ie</u></b>", imageTool: "st<b><u>ie</u></b>r" },
  "ou": { klinktAls:"ou",letters:"ou", audio: "https://www.instructielezen.be/fonetics/ou.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ou_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ou_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ou.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ou_tool.png", blockRepresentation: "2", imageWord: "m<b><u>ou</u></b>w", imageTool: "g<b><u>ou</u></b>dvis" },
  "au": { klinktAls:"ou",letters:"au", audio: "https://www.instructielezen.be/fonetics/au.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ou_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ou_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ou.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ou_tool.png", blockRepresentation: "2", imageWord: "m<b><u>ou</u></b>w", imageTool: "g<b><u>ou</u></b>dvis" },
  "ei": { klinktAls:"ij",letters:"ei", audio: "https://www.instructielezen.be/fonetics/ei.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ij_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ij_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ij.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ij_tool.png", blockRepresentation: "2", imageWord: "d<b><u>ij</u></b>", imageTool: "b<b><u>ij</u></b>" },
  "sch": { klinktAls:"sch", letters:"sch", audio: "https://www.instructielezen.be/fonetics/sch.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/sch_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/sch_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/sch.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/sch_tool.png", blockRepresentation: "C", imageWord: "<b><u>sch</u></b>ouder", imageTool: "vlind<b><u>e</u></b>r" },
  "ch": { klinktAls:"ch", letters:"ch", audio: "https://www.instructielezen.be/fonetics/ch.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ch_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ch_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ch.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/ch_tool.png", blockRepresentation: "C", imageWord: "li<b><u>ch</u></b>aam", imageTool: "vlind<b><u>e</u></b>r" },
  "calss": { klinktAls:"s", letters:"c", audio: "https://www.instructielezen.be/fonetics/s.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/s_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/s_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/s.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/s_tool.png", blockRepresentation: "C", imageWord: "<b><u>s</u></b>chouder", imageTool: "vlind<b><u>e</u></b>r" },
  "dalst": { klinktAls:"t", letters:"d", audio: "https://www.instructielezen.be/fonetics/t.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/t_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/t_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/t.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/t_tool.png", blockRepresentation: "C", imageWord: "<b><u>t</u></b>een", imageTool: "<b><u>t</u></b>ijger" },
  "calsk": { klinktAls:"k", letters:"c", audio: "https://www.instructielezen.be/fonetics/k.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/k_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/k_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/k.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/k_tool.png", blockRepresentation: "C", imageWord: "<b><u>k</u></b>in", imageTool: "<b><u>k</u></b>oe" },
  "ccalsk": { klinktAls:"k", letters:"cc", audio: "https://www.instructielezen.be/fonetics/k.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/k_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/k_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/k.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/k_tool.png", blockRepresentation: "C", imageWord: "<b><u>k</u></b>in", imageTool: "<b><u>k</u></b>at" },
  "aalsaa": { klinktAls:"aa", letters:"a", audio:  "https://www.instructielezen.be/fonetics/aa.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/aa_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/aa_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/aa.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/aa_tool.png", blockRepresentation: "--", imageWord: "h<b><u>aa</u></b>r", imageTool: "<b><u>aa</u></b>p" },
  "ealsee": { klinktAls:"ee", letters:"e", audio: "https://www.instructielezen.be/fonetics/ee.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ee_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ee_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ee.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ee_tool.png", blockRepresentation: "--", imageWord: "b<b><u>ee</u></b>n", imageTool: "b<b><u>ee</u></b>r" },
  "ualsuu": { klinktAls:"uu",letters:"u", audio: "https://www.instructielezen.be/fonetics/uu.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/uu_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/uu_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/uu.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/uu_tool.png", blockRepresentation: "-", imageWord: "m<b><u>uu</u></b>nd", imageTool: "f<b><u>uu</u></b>t" },
  "oalsoo": { klinktAls:"oo", letters:"o", audio: "https://www.instructielezen.be/fonetics/oo.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/oo_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/oo_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/oo.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/oo_tool.png", blockRepresentation: "--", imageWord: "<b><u>oo</u></b>r", imageTool: "v<b><u>o</u></b>gel" },
  "galsch": { klinktAls:"ch", letters:"g", audio: "https://www.instructielezen.be/fonetics/ch.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ch_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ch_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ch.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/ch_tool.png", blockRepresentation: "C", imageWord: "li<b><u>ch</u></b>aam", imageTool: "<b><u>ch</u></b>" },
  "ialsdoffe": { klinktAls:"e", letters:"i", audio: "https://www.instructielezen.be/fonetics/doffe.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/doffe_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/doffe_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/doffe.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/doffe_tool.png", blockRepresentation: "--", imageWord: "tand<b><u>e</u></b>n", imageTool: "vlind<b><u>e</u></b>r" },
  "ea": { klinktAls:"ee aa", letters:"ea", audio: "https://www.instructielezen.be/fonetics/ea.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ea_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ea_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ea.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ea_tool.png", blockRepresentation: "--", imageWord: "", imageTool: "" },
  "th": { klinktAls:"t", letters:"th", audio: "https://www.instructielezen.be/fonetics/t.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/t.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/t.mp3", articulation: "https://www.instructielezen.be/fonetics/t.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/t_tool.png", blockRepresentation: "CC", imageWord: "<b><u>t</u></b>een", imageTool: "<b><u>t</u></b>ijger" },
  "dt": { klinktAls:"t", letters:"dt", audio: "https://www.instructielezen.be/fonetics/t.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/t.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/t.mp3", articulation: "https://www.instructielezen.be/fonetics/t.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/t_tool.png", blockRepresentation: "CC", imageWord: "<b><u>t</u></b>een", imageTool: "<b><u>t</u></b>ijger" },
  "é": { klinktAls:"ee", letters:"é", audio: "https://www.instructielezen.be/fonetics/ee.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ee.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ee.mp3", articulation: "https://www.instructielezen.be/fonetics/ee.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ee_tool.png", blockRepresentation: "--", imageWord: "t<b><u>ee</u></b>n", imageTool: "b<b><u>ee</u></b>n" },
  "è": { klinktAls:"ij", letters:"è", audio: "https://www.instructielezen.be/fonetics/ij.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ij_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ij_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ij.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ij_tool.png", blockRepresentation: "-", imageWord: "d<b><u>ij</u></b>", imageTool: "b<b><u>ij</u></b>" },
  "ë": { klinktAls:"je", letters:"ë", audio: "https://www.instructielezen.be/fonetics/epuntjes.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/epuntjes_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/epuntjes_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/epuntjes.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/epuntjes_tool.png", blockRepresentation: "-", imageWord: " ", imageTool: " " },
  "à": { klinktAls:"", letters:"à", audio: "https://www.instructielezen.be/fonetics/aaccent.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/aaccent_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/aaccent_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/aaccent.png", type: "vowels", tool: "https://www.instructielezen.be/fonetics/aaccent_tool.png", blockRepresentation: "-", imageWord: "<b><u>t</u></b>een", imageTool: "<b><u>t</u></b>ijger" },
  "ö": { klinktAls:"", letters:"ö", audio: "https://www.instructielezen.be/fonetics/opuntjes.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/opuntjes_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/opuntjes_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/opuntjes.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/opuntjes_tool.png", blockRepresentation: "-", imageWord: "", imageTool: "" },
  "eaualsoo": { klinktAls:"oo", letters:"eau", audio: "https://www.instructielezen.be/fonetics/oo.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/oo_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/oo_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/oo.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/oo_tool.png", blockRepresentation: "--", imageWord: "<b><u>oo</u></b>r", imageTool: "v<b><u>o</u></b>gel" },
  "talss": { klinktAls:"s", letters:"t", audio: "https://www.instructielezen.be/fonetics/s.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/s_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/s_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/s.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/s_tool.png", blockRepresentation: "C", imageWord: "<b><u>s</u></b>chouder", imageTool: "<b><u>s</u></b>lang" },
  "ijalsdoffe": { klinktAls:"e", letters:"ij", audio: "https://www.instructielezen.be/fonetics/doffe.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/doffe_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/doffe_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/doffe.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/doffe_tool.png", blockRepresentation: "V", imageWord: "tand<b><u>e</u></b>n", imageTool: "vlind<b><u>e</u></b>r" },
  "salsz": { klinktAls:"z", letters:"s", audio: "https://www.instructielezen.be/fonetics/z.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/z_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/z_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/z.png", type: "consonant", tool: "https://www.instructielezen.be/fonetics/z_tool.png", blockRepresentation: "C", imageWord: "<b><u>z</u></b>ool", imageTool: "<b><u>z</u></b>ebra" },
  "aalsij": { klinktAls:"ij",letters:"a", audio: "https://www.instructielezen.be/fonetics/ij.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ij_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ij_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ij.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ij_tool.png", blockRepresentation: "2", imageWord: "d<b><u>ij</u></b>", imageTool: "b<b><u>ij</u></b>" },
  "ia": { klinktAls:"ieja",letters:"ia", audio: "https://www.instructielezen.be/fonetics/ia.mp3", audio_uitleg: "https://www.instructielezen.be/fonetics/ia_uitleg.mp3", tool_uitleg: "https://www.instructielezen.be/fonetics/ia_tool_uitleg.mp3", articulation: "https://www.instructielezen.be/fonetics/ia.png", type: "vowel", tool: "https://www.instructielezen.be/fonetics/ia_tool.png", blockRepresentation: "2", imageWord: "", imageTool: "cav<b><u>ia</u></b>" }
};

export default function CheckKlankteken() {
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [klankInput, setKlankInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [stats, setStats] = useState({ total: 0, checked: 0, unchecked: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchStats = async () => {
    try {
      const { count: totalToBeChecked } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('klankteken_tobechecked', 1);

      const { count: checkedCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('klankteken_tobechecked', 1)
        .eq('klankteken_checked', 1);

      const { count: uncheckedCount } = await supabase
        .from('wordfrequency')
        .select('*', { count: 'exact', head: true })
        .eq('klankteken_tobechecked', 1)
        .eq('klankteken_checked', 0);

      setStats({
        total: totalToBeChecked || 0,
        checked: checkedCount || 0,
        unchecked: uncheckedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRandomWord = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wordfrequency')
        .select('id, word, klankteken, opmerking')
        .eq('klankteken_tobechecked', 1)
        .eq('klankteken_checked', 0)
        .order('id', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.length);
        const word = data[randomIndex];
        setCurrentWord(word);
        setKlankInput(word.klankteken || '');
      } else {
        setCurrentWord(null);
        setKlankInput('');
        showNotification('success', 'Alle woorden zijn gecontroleerd!');
      }
    } catch (error) {
      console.error('Error fetching word:', error);
      showNotification('error', 'Fout bij ophalen woord');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentWord || submitting || !klankInput.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .update({
          klankteken: klankInput.trim(),
          klankteken_checked: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentWord.id);

      if (error) throw error;

      showNotification('success', `Klankteken voor "${currentWord.word}" opgeslagen`);
      await fetchStats();
      await fetchRandomWord();
    } catch (error) {
      console.error('Error saving word:', error);
      showNotification('error', 'Fout bij opslaan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await fetchRandomWord();
  };

  const handleDelete = async () => {
    if (!currentWord || submitting) return;

    if (!confirm(`Ben je zeker dat je het woord "${currentWord.word}" wilt verwijderen?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('wordfrequency')
        .delete()
        .eq('id', currentWord.id);

      if (error) throw error;

      showNotification('success', `Woord "${currentWord.word}" verwijderd`);
      await fetchStats();
      await fetchRandomWord();
    } catch (error) {
      console.error('Error deleting word:', error);
      showNotification('error', 'Fout bij verwijderen');
    } finally {
      setSubmitting(false);
    }
  };

  const playKlanken = () => {
    const input = klankInput.trim();
    if (!input) {
      showNotification('error', 'Voer eerst klanktekens in');
      return;
    }

    const parts = input.split('-').map(p => p.trim()).filter(p => p);
    if (parts.length === 0) return;

    setIsPlaying(true);
    let i = 0;

    const playNext = () => {
      if (i >= parts.length) {
        setIsPlaying(false);
        return;
      }

      const ph = parts[i];
      const phoneme = phonemeAssets[ph];

      if (phoneme && phoneme.audio) {
        const audio = new Audio(phoneme.audio);
        audio.onended = () => {
          i++;
          playNext();
        };
        audio.onerror = () => {
          i++;
          playNext();
        };
        audio.play().catch(() => {
          i++;
          playNext();
        });
      } else {
        i++;
        playNext();
      }
    };

    playNext();
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchStats();
    fetchRandomWord();
  }, []);

  return (
    <div className="w-full h-full p-6 space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Totaal te controleren</p>
          <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Gecontroleerd</p>
          <p className="text-3xl font-bold text-green-900">{stats.checked}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium">Nog te controleren</p>
          <p className="text-3xl font-bold text-orange-900">{stats.unchecked}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : currentWord ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 space-y-6 relative">
          <button
            onClick={fetchRandomWord}
            disabled={loading || submitting}
            className="absolute top-4 right-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Ververs"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-2 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Woord #{currentWord.id}</p>
            </div>
            <h2 className="text-5xl font-bold text-gray-900">{currentWord.word}</h2>
            {currentWord.opmerking && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm font-medium text-yellow-900">Opmerking:</p>
                <p className="text-yellow-800">{currentWord.opmerking}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-700 font-medium">Klankteken (gescheiden met -)</span>
              <input
                type="text"
                value={klankInput}
                onChange={(e) => setKlankInput(e.target.value)}
                className="mt-1 block w-full px-4 py-3 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bijv: a-calsk-t-uaalsuuwa-l-ialsie-t-ei-t"
                disabled={submitting}
                autoFocus
              />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={playKlanken}
              disabled={submitting || isPlaying || !klankInput.trim()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Volume2 className="w-5 h-5" />
              Speel af
            </button>
            <button
              onClick={handleSave}
              disabled={submitting || !klankInput.trim()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              Opslaan
            </button>
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-5 h-5" />
              Overslaan
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
              Verwijder
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Alles is nagekeken!</h2>
          <p className="text-gray-600">Er zijn geen woorden meer die gecontroleerd moeten worden.</p>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Speciale Klank-teken</h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>Hier proberen we woorden te koppelen aan de juiste klanken. Bij twijfel altijd overslaan.</p>
          <p>De regel is: wanneer het is zoals de letter, gewoon de letter laten, wanneer het anders is zet je eerst de letters en dan de klanken.</p>
          <p className="font-medium">Voorbeeld: actualiteit : a-calsk-t-uaalsuuwa-l-ialsie-t-ei-t</p>

          <h4 className="font-bold mt-4 mb-2">Belangrijke regels:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Dubbele medeklinkers zet je dubbel (bb bij dubbel)</li>
            <li>De structuur bij speciale klanken is 'letters in woord' + 'als' + 'hoe het klinkt' (bijv. '<strong>x</strong>als<strong>ks</strong>' bij exuses)</li>
            <li>Meestal is de 'e' nog aan te passen als 'doffe'</li>
          </ul>

          <h4 className="font-bold mt-4 mb-2">Veelgebruikte combinaties:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <p><strong>Klinkers:</strong> doffe, ialsdoffe, ijalsdoffe, ualsuu, ealsee, oalsoo, aalsaa</p>
              <p><strong>Tweeklanken:</strong> oei, eeu, ieu, ooi, aai, ia</p>
            </div>
            <div>
              <p><strong>Medeklinkers:</strong> ng, nk, sch, ch, dt, th</p>
              <p><strong>Varianten:</strong> salsz, xalsks, balsp, walsv, ckalsk, ggalsch, talss, sjalsch, zalss, shalsch, calss, dalst, galsch</p>
            </div>
          </div>

          <div className="mt-3 text-sm bg-blue-50 border border-blue-200 rounded p-3">
            <p><strong>Speciale tekens:</strong> é, è, ë, à, ö</p>
            <p><strong>Extra combinaties:</strong> oaalsoo, iealsy, salssch, dtalst, uialsi, ië, gnalsnj, ëalsee, eyalsie, uisalswie, eualseju, ueealsuwee, ueealsuuwee, uaalsuuwa, ealsniets, oualsoo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
