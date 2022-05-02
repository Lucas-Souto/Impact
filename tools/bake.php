<?php
if(count($argv) < 2)
{
	echo "Usage: bake.php <in...> <out>\n";
	echo "e.g. bake.php mygame-baked.js\n";

	die;
}

$baker = new Baker(Baker::MINIFIED);
$baker->bake($argv[1]);

class Baker
{
	const PLAIN = 0;
	const MINIFIED = 1;
	const GZIPPED = 2;
	
	protected $base = '';
	protected $ignoreFile = 'index.js';
	protected $format = 0;
	protected $loaded = array();
	protected $currentInput = 'Command Line';
	protected $fileCount = 0, $bytesIn = 0, $bytesOut = 0;
	
	public function __construct($format = 0)
	{
		$this->format = $format;
		$this->base = realpath(dirname(__DIR__)) . '\\';
		
		if($this->format & self::MINIFIED) require_once('jsmin.php');
	}
	
	public function bake($outFile)
	{
		$this->fileCount = 0;
		$this->bytesIn = 0;
		$out = implode("\n", $this->loadAll('lib/game/main.js'));

		if($this->format & self::MINIFIED) $out = "/*! Built with Krater */\n\n" . JSMin::minify($out);
		
		$bytesOut = strlen($out);
		$bytesOutZipped = 0;
		
		echo "writing $outFile\n";

		@file_put_contents($outFile, $out) or die("ERROR: Couldn't write to $outFile\n");
		
		if($this->format & self::GZIPPED)
		{
			$gzFile = "$outFile.gz";

			echo "writing $gzFile\n";

			$fh = gzopen($gzFile, 'w9') or die("ERROR: Couldn't write to $gzFile\n");
				
			gzwrite($fh, $out);
			gzclose($fh);

			$bytesOutZipped = filesize($gzFile);
		}
		
		echo "\nbaked {$this->fileCount} files: ".
			round($this->bytesIn / 1024, 1) . "kb -> " . round($bytesOut / 1024, 1) . "kb" .
			($this->format & self::GZIPPED ? " (" . round($bytesOutZipped / 1024, 1) . "kb gzipped)\n" : "\n");
	}

	protected function loadAll($start)
	{
		$code = $this->load($this->base . $start);
		$code = preg_split("/\r\n|\n|\r/", $code);
		$importedCode = [];
		
		foreach ($code as $key => $value)
		{
			if (strpos(trim($value), 'export') === 0)
			{
				if (basename($start) === $this->ignoreFile) array_splice($code, $key);

				$code[$key] = '';
			}
			else if (strpos(trim($value), 'import') === 0)
			{
				preg_match('/(?<=["\'])(.*?)(?=["\'])/', $value, $importPath, PREG_OFFSET_CAPTURE, 0);

				$importPath = $importPath[0][0];

				if (strpos($importPath, './') === 0)
				{
					$importPath = substr($importPath, 2, strlen($importPath) - 2);
					$importPath = dirname($start) . '\\' . $importPath;
				}
				else
				{
					while (strpos($importPath, '../') === 0)
					{
						$importPath = substr($importPath, 3, strlen($importPath) - 3);
						$importPath = dirname(dirname($start)) . '\\' . $importPath;
					}
				}
				
				$importedCode = array_merge($importedCode, $this->loadAll($importPath));

				$code[$key] = '';
			}
		}
		
		return array_merge($importedCode, $code);
	}
	
	protected function load($path)
	{
		if(isset($this->loaded[realpath($path)])) return '';
		
		if(!file_exists($path)) die("ERROR: Couldn't load $path required from {$this->currentInput}\n");
		
		echo "loading $path \n";
		
		$this->loaded[realpath($path)] = true;
		$this->currentInput = $path;
		
		$code = file_get_contents($path);
		$this->bytesIn += strlen($code);
		$this->fileCount++;
		
		return $code;
	}
}
?>