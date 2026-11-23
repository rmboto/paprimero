import pathlib
d=pathlib.Path(__file__).parent
head=(d/'a_head.html').read_text(encoding='utf-8')
js=''.join((d/f).read_text(encoding='utf-8')+'\n' for f in ['b_engine.js','c_math.js','e_music.js','d_ex1.js','d_ex2.js','f0_ranking.js','f_app.js','g_tests.js'])
out=head+'<script>\n'+js+'</script>\n</body>\n</html>\n'
(d.parent/'index.html').write_text(out,encoding='utf-8')
print(len(out))
