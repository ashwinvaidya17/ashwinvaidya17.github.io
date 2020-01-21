---
id: 321
title: Fashion MNIST Loader
date: 2019-04-29T17:55:13+05:30
author: Ashwin Vaidya
layout: post
guid: http://ashwinvaidya.com/?p=321
permalink: /blog/fashion-mnist-loader/
image: /wp-content/uploads/2019/04/Fashion-MNIST_boot.png
categories:
  - machine learning
tags:
  - dataset
  - fashion
  - mnist
  - python
---
## Motivation

The fashion MNIST dataset is a replacement of the MNIST dataset. Like the 10 digits, it has 10 classes.

<table class="wp-block-table">
  <tr>
    <th>
      <strong>Label</strong>
    </th>
    
    <th>
      <strong>Description</strong>
    </th>
  </tr>
  
  <tr>
    <td>
    </td>
    
    <td>
      T-shirt/top
    </td>
  </tr>
  
  <tr>
    <td>
      1
    </td>
    
    <td>
      Trouser
    </td>
  </tr>
  
  <tr>
    <td>
      2
    </td>
    
    <td>
      Pullover
    </td>
  </tr>
  
  <tr>
    <td>
      3
    </td>
    
    <td>
      Dress
    </td>
  </tr>
  
  <tr>
    <td>
      4
    </td>
    
    <td>
      Coat
    </td>
  </tr>
  
  <tr>
    <td>
      5
    </td>
    
    <td>
      Sandal
    </td>
  </tr>
  
  <tr>
    <td>
      6
    </td>
    
    <td>
      Shirt
    </td>
  </tr>
  
  <tr>
    <td>
      7
    </td>
    
    <td>
      Sneaker
    </td>
  </tr>
  
  <tr>
    <td>
      8
    </td>
    
    <td>
      Bag
    </td>
  </tr>
  
  <tr>
    <td>
      9
    </td>
    
    <td>
      Ankle boot
    </td>
  </tr>
</table>

While it comes bundled with many deep learning libraries, I wanted to use it for my own project. One choice would have been to download it from here[: https://github.com/zalandoresearch/fashion-mnist](https://github.com/zalandoresearch/fashion-mnist). Then extract the dataset and finally load it in my program.

As a programmer, I am not a big fan of doing things on my own. Further, this method is not scalable. If I want a different dataset in the future I will have to perform the same steps manually and create another loader for that data. So, I decided to write my own data loader.

## Directory Structure

I created two scripts: data\_downloader.py and fashion\_mnist.py. The idea is that data\_downloader will be common utility for all the loaders to download their respective datasets. fashion\_mnist contains specific code to load the data and the web urls to pass to the data_downloader to fetch the data.

The folder structure is as follows:

utils/data_downloader.py  
datasets/fashion_mnist.py

The datasets folder is separate to have a single directory for loader scripts of different datasets and keep them separate from the common utilities.

## Scripts

Both the scripts are given below:

```python
""" data_downloader.py
Common functions for downloading dataset
"""

import os
import requests

def get_file(fname, origin, cache_subdir):
    """Downloads the file from URL is it is not yet in cache
    Arguments
    fname: name of the file
    origin: Remote URL of the file

    Return: Path to downloaded file
    """

    cache_dir = os.path.join(os.path.expanduser('~'), '.datasets') # create temporary download location
    datadir = os.path.join(cache_dir, cache_subdir)
    if not os.path.exists(datadir):
        os.makedirs(datadir)
    fpath = os.path.join(datadir, fname)

    if not os.path.exists(fpath):
        print(fname, "does not exist")
        print("Downloading data from", origin)
        r = requests.get(origin, stream = True)
        with open(fpath, 'wb') as file:
            for chunk in r.iter_content(chunk_size = 1024):
                if chunk:
                    file.write(chunk)
        print("Finished downloading ", fname)

    return fpath
```

The datasets are downloaded into a directory named ._datasets_ in the home folder of the user. Linux/OSX systems consider files and directories that start with a dot as hidden. Keeping the downloaded datasets folder reduces visible clutter in the home directory. The script also creates another folder inside the .datasets folder with the name of the dataset for storing the downloaded data. I may add file integrity check in the future but this works for now.

```python
""" fashion_mnist.py
Fashion MNIST dataset loader
"""

import gzip
import os
import numpy as np
from ..utils.data_downloader import get_file


def load_data():
    """ Loads the Fashion MNIST dataset
    return: x_train, y_train, x_test, y_test
    """
    dirname = os.path.join('datasets', 'fashion_mnist')
    base = 'http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/'
    files = ['train-labels-idx1-ubyte.gz', 'train-images-idx3-ubyte.gz',
             't10k-labels-idx1-ubyte.gz', 't10k-images-idx3-ubyte.gz']

    paths = []

    for fname in files:
        paths.append(get_file(fname, origin=base + fname, cache_subdir=dirname))

    with gzip.open(paths[0], 'rb') as lbpath:
        y_train = np.frombuffer(lbpath.read(), np.uint8, offset=8)

    with gzip.open(paths[1], 'rb') as imgpath:
        x_train = np.frombuffer(imgpath.read(), np.uint8,
                                offset=16).reshape(len(y_train), 28, 28)

    with gzip.open(paths[2], 'rb') as lbpath:
        y_test = np.frombuffer(lbpath.read(), np.uint8, offset=8)


    with gzip.open(paths[3], 'rb') as imgpath:
        x_test = np.frombuffer(imgpath.read(), np.uint8,
                               offset=16).reshape(len(y_test), 28, 28)

    y_train = [vectorize_data(i) for i in y_train]
    y_test = [vectorize_data(i) for i in y_test]
    
    return x_train, y_train, x_test, y_test

def vectorize_data(y):
    e = np.zeros((10,1))
    e[y] = 1.0
    return e
```

The original data contains each image represented in a 2D array and the corresponding labels as a single digit. I am not flattening the image here as 2D input is convenient when using Convolutional Neural Networks. The label is vectorized because the output layer of any neural network will be of 10 units each representing a single digit. It is easier to vectorize here and convert it to pure labels later if required.

And finally you can import the dataset as:

```python
from datasets import fashion_mnist
x_train, y_train, x_test, y_test = fashion_mnist.load_data()
```

Thanks for reading 😎